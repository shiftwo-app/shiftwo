// イベントのタイムテーブル（FR-6）の取り込み・直す・消すと権限を、実際の DB で確かめる。
// DATABASE_URL がない環境では飛ばす
import { afterAll, beforeAll, describe, expect, it } from "vite-plus/test";
import { loadEnvFileIfExists } from "../lib/load-env";

loadEnvFileIfExists();
const hasDatabase = Boolean(process.env.DATABASE_URL);

describe.skipIf(!hasDatabase)("タイムテーブル（DB）", async () => {
	const { prisma } = await import("../lib/prisma.server");
	const org = await import("./org.server");
	const timetable = await import("./timetable.server");

	const suffix = crypto.randomUUID().slice(0, 8);
	const userIds: string[] = [];
	let organizationId = "";
	let orgSlug = "";
	let tenantSlug = "";
	let owner = "";
	let staffUser = "";

	const csv = (rows: string[]) =>
		["title,speaker,room,start,end,track_color,tags", ...rows].join("\n");
	const row = (title: string, room: string, start: string, end: string) =>
		`${title},登壇者,${room},2026-11-20 ${start},2026-11-20 ${end},,`;

	const scope = (eventSlug: string) => ({ orgSlug, tenantSlug, eventSlug });

	beforeAll(async () => {
		const createUser = async (name: string) => {
			const user = await prisma.user.create({
				data: {
					id: crypto.randomUUID(),
					email: `${name}-${suffix}@example.com`,
					name,
					emailVerified: true,
				},
			});
			userIds.push(user.id);
			return user.id;
		};
		owner = await createUser("tt-owner");
		staffUser = await createUser("tt-staff");
		const created = await org.createOrganization({
			userId: owner,
			name: "タイムテーブルの団体",
			slug: `tt-${suffix}`,
			displayName: "owner",
		});
		if (!created.ok) throw new Error(created.errors.join());
		orgSlug = created.slug;
		const organization = await prisma.organization.findUniqueOrThrow({
			where: { slug: orgSlug },
		});
		organizationId = organization.id;
		const tenant = await prisma.tenant.findFirstOrThrow({
			where: { organizationId },
		});
		tenantSlug = tenant.slug;
		for (const slug of ["conf", "other"]) {
			await prisma.event.create({
				data: {
					organizationId,
					tenantId: tenant.id,
					slug,
					name: slug,
					startsAt: new Date("2026-11-20T09:00:00+09:00"),
					endsAt: new Date("2026-11-20T18:00:00+09:00"),
				},
			});
		}
		// 「スタッフ」のロール（シフトを見るだけ）のメンバー
		const staffRole = await prisma.orgRole.findFirstOrThrow({
			where: { organizationId, name: "スタッフ" },
		});
		await prisma.member.create({
			data: {
				organizationId,
				userId: staffUser,
				displayName: "staff",
				roles: { create: { roleId: staffRole.id } },
			},
		});
	});

	afterAll(async () => {
		await prisma.organization.deleteMany({ where: { id: organizationId } });
		await prisma.user.deleteMany({ where: { id: { in: userIds } } });
	});

	it("確かめるだけでは登録せず、取り込むとまるごと置き換える", async () => {
		const access = await timetable.requireTimetableAccess(
			owner,
			scope("conf"),
			"event.manage",
		);
		const input = (content: string, apply: boolean) => ({
			content,
			format: "csv" as const,
			fileName: "tt.csv",
			apply,
		});
		const preview = await timetable.importTimetable(
			access,
			input(csv([row("基調講演", "A", "10:00", "10:40")]), false),
		);
		expect(preview.ok && !preview.applied && preview.rows.length).toBe(1);
		expect(await timetable.listSessions(access.event.id)).toHaveLength(0);

		await timetable.importTimetable(
			access,
			input(csv([row("基調講演", "A", "10:00", "10:40")]), true),
		);
		const applied = await timetable.importTimetable(
			access,
			input(
				csv([
					row("LT", "A", "11:00", "11:30"),
					row("ワークショップ", "B", "11:00", "12:00"),
				]),
				true,
			),
		);
		expect(applied).toEqual({ ok: true, applied: true, count: 2 });
		const sessions = await timetable.listSessions(access.event.id);
		expect(sessions.map((s) => s.title)).toEqual(["LT", "ワークショップ"]);
	});

	it("1 行でも問題があれば何も変えない（期間の外など）", async () => {
		const access = await timetable.requireTimetableAccess(
			owner,
			scope("conf"),
			"event.manage",
		);
		const result = await timetable.importTimetable(access, {
			content: csv([
				row("ok", "A", "10:00", "11:00"),
				row("夜", "A", "19:00", "20:00"),
			]),
			format: "csv",
			fileName: "tt.csv",
			apply: true,
		});
		expect(result.ok).toBe(false);
		expect(await timetable.listSessions(access.event.id)).toHaveLength(2);
	});

	it("シフトを見るだけの人は見られるが、取り込み・直す・消すはできない", async () => {
		const view = await timetable.requireTimetableAccess(
			staffUser,
			scope("conf"),
		);
		expect(view.canManage).toBe(false);
		expect(await timetable.listSessions(view.event.id)).toHaveLength(2);
		await expect(
			timetable.requireTimetableAccess(
				staffUser,
				scope("conf"),
				"event.manage",
			),
		).rejects.toMatchObject({ status: 403 });

		const [session] = await timetable.listSessions(view.event.id);
		// 権限の確かめを飛ばして呼ばれても、中でも断る
		expect((await timetable.deleteSession(view, session!.id)).ok).toBe(false);
		expect((await timetable.clearTimetable(view)).ok).toBe(false);
		expect(await timetable.listSessions(view.event.id)).toHaveLength(2);
	});

	it("ほかのイベントのセッションは、直すことも消すこともできない", async () => {
		const conf = await timetable.requireTimetableAccess(
			owner,
			scope("conf"),
			"event.manage",
		);
		const other = await timetable.requireTimetableAccess(
			owner,
			scope("other"),
			"event.manage",
		);
		const [session] = await timetable.listSessions(conf.event.id);
		expect((await timetable.deleteSession(other, session!.id)).ok).toBe(false);
		const updated = await timetable.updateSession(other, session!.id, {
			...session!,
			title: "書き換え",
		});
		expect(updated.ok).toBe(false);
		expect((await timetable.listSessions(conf.event.id))[0]?.title).toBe("LT");

		// 同じイベントなら直せる（取り込みと同じ決まりで確かめる）
		const bad = await timetable.updateSession(conf, session!.id, {
			...session!,
			end: session!.start,
		});
		expect(bad.ok).toBe(false);
		const good = await timetable.updateSession(conf, session!.id, {
			...session!,
			title: "LT（改）",
		});
		expect(good).toEqual({ ok: true });
	});

	it("日常シフト（イベントなし）にはタイムテーブルがない", async () => {
		await expect(
			timetable.requireTimetableAccess(owner, {
				orgSlug,
				tenantSlug,
				eventSlug: "nope",
			}),
		).rejects.toMatchObject({ status: 404 });
	});
});
