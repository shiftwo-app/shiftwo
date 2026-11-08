// スタッフの希望（FR-5）を、実際の DB で確かめる：本人と、全員の希望を扱える人の違い、締切、
// 団体全体 → テナント → イベントの上書き、入力の決まり。DATABASE_URL がない環境では飛ばす
import { afterAll, beforeAll, describe, expect, it } from "vite-plus/test";
import { loadEnvFileIfExists } from "../lib/load-env";
import type { PreferenceScope } from "../lib/preferences";

loadEnvFileIfExists();
const hasDatabase = Boolean(process.env.DATABASE_URL);

describe.skipIf(!hasDatabase)("スタッフの希望（DB）", async () => {
	const { prisma } = await import("../lib/prisma.server");
	const org = await import("./org.server");
	const preferences = await import("./preferences.server");

	const suffix = crypto.randomUUID().slice(0, 8);
	const userIds: string[] = [];
	let orgSlug = "";
	let organizationId = "";
	let tenant: { id: string; slug: string };
	let event: { id: string; slug: string };
	let owner: { id: string };
	let staffUser: { id: string };
	let ownerStaffId = "";
	let myStaffId = "";
	let eventPositionId = "";
	let tenantPositionId = "";

	const at = (time: string) => `2026-11-20T${time}:00+09:00`;
	const input = (
		breaks: [string, string][],
		positionIds: string[] = [],
		memo = "",
	) => ({
		breaks: breaks.map(([start, end]) => ({ start: at(start), end: at(end) })),
		positionIds,
		memo,
	});
	const scopes = {
		org: { level: "org" } as PreferenceScope,
		tenant: () =>
			({ level: "tenant", tenantSlug: tenant.slug }) as PreferenceScope,
		event: () =>
			({
				level: "event",
				tenantSlug: tenant.slug,
				eventSlug: event.slug,
			}) as PreferenceScope,
	};
	const contextOf = (userId: string, scope: PreferenceScope) =>
		preferences.requirePreferenceContext(userId, orgSlug, scope);

	const createUser = async (label: string) => {
		const user = await prisma.user.create({
			data: {
				id: crypto.randomUUID(),
				email: `${label}-${suffix}@example.com`,
				name: label,
				emailVerified: true,
			},
		});
		userIds.push(user.id);
		return user;
	};

	beforeAll(async () => {
		owner = await createUser("p-owner");
		const created = await org.createOrganization({
			userId: owner.id,
			name: "希望の団体",
			slug: `p-${suffix}`,
			displayName: "owner",
		});
		if (!created.ok) throw new Error(created.errors.join());
		orgSlug = created.slug;
		const organization = await prisma.organization.findUniqueOrThrow({
			where: { slug: orgSlug },
		});
		organizationId = organization.id;
		tenant = await prisma.tenant.findFirstOrThrow({
			where: { organizationId },
			select: { id: true, slug: true },
		});
		event = await prisma.event.create({
			data: {
				organizationId,
				tenantId: tenant.id,
				slug: "conf",
				name: "カンファレンス",
				startsAt: new Date(at("09:00")),
				endsAt: new Date(at("18:00")),
			},
			select: { id: true, slug: true },
		});

		// 「スタッフ」のロール（シフトを見るだけ）のメンバー
		staffUser = await createUser("p-staff");
		const staffRole = await prisma.orgRole.findFirstOrThrow({
			where: { organizationId, name: "スタッフ" },
		});
		const member = await prisma.member.create({
			data: {
				organizationId,
				userId: staffUser.id,
				displayName: "staff",
				roles: { create: { roleId: staffRole.id } },
			},
		});
		const ownerMember = await prisma.member.findFirstOrThrow({
			where: { organizationId, userId: owner.id },
		});
		myStaffId = (
			await prisma.staff.create({
				data: {
					organizationId,
					name: "スタッフさん",
					memberId: member.id,
					unavailableTimes: [],
				},
			})
		).id;
		ownerStaffId = (
			await prisma.staff.create({
				data: {
					organizationId,
					name: "オーナーさん",
					memberId: ownerMember.id,
					unavailableTimes: [],
				},
			})
		).id;
		const position = (eventId: string | null, name: string) =>
			prisma.position.create({
				data: {
					organizationId,
					tenantId: tenant.id,
					eventId,
					name,
					color: "#cccccc",
					requiredStaffCount: 1,
				},
			});
		eventPositionId = (await position(event.id, "受付")).id;
		tenantPositionId = (await position(null, "レジ")).id;
	});

	afterAll(async () => {
		await prisma.organization.deleteMany({ where: { id: organizationId } });
		await prisma.user.deleteMany({ where: { id: { in: userIds } } });
	});

	it("本人は自分の希望を出せるが、ほかの人の希望は直せず、全員の一覧も見られない", async () => {
		const context = await contextOf(staffUser.id, scopes.org);
		expect(context.canManageAll).toBe(false);
		expect(
			await preferences.savePreference(
				context,
				myStaffId,
				input([["12:00", "13:00"]]),
			),
		).toEqual({ ok: true });
		expect(
			await preferences.savePreference(context, ownerStaffId, input([])),
		).toMatchObject({ ok: false });
		await expect(preferences.listPreferences(context)).rejects.toMatchObject({
			status: 403,
		});
	});

	it("締切を過ぎると本人は変えられないが、全員の希望を扱える人は変えられる", async () => {
		const ownerContext = await contextOf(owner.id, scopes.org);
		expect(
			await preferences.setPreferenceSettings(ownerContext, {
				deadline: new Date("2026-11-01T00:00:00+09:00"),
			}),
		).toEqual({ ok: true });
		const after = new Date("2026-11-02T00:00:00+09:00");
		const staffContext = await contextOf(staffUser.id, scopes.org);
		expect(
			await preferences.savePreference(
				staffContext,
				myStaffId,
				input([]),
				after,
			),
		).toMatchObject({ ok: false, errors: [expect.stringMatching(/締切/)] });
		expect(
			await preferences.savePreference(
				await contextOf(owner.id, scopes.org),
				myStaffId,
				input([["12:00", "13:00"]], [], "オーナーが直した"),
				after,
			),
		).toEqual({ ok: true });
		// 締切を決める権限がない人は決められない
		expect(
			await preferences.setPreferenceSettings(staffContext, { deadline: null }),
		).toMatchObject({ ok: false });
		await preferences.setPreferenceSettings(ownerContext, { deadline: null });
	});

	it("イベントでは、イベントの希望がなければテナント・団体全体の希望を使い、上書きをやめれば戻る", async () => {
		const eventContext = await contextOf(staffUser.id, scopes.event());
		const inherited = await preferences.getPreferenceOf(eventContext, {
			id: myStaffId,
			name: "",
		});
		expect(inherited.own).toBeNull();
		expect(inherited.effective.source).toBe("org");
		expect(inherited.effective.memo).toBe("オーナーが直した");

		expect(
			await preferences.savePreference(
				eventContext,
				myStaffId,
				input([["15:00", "15:30"]], [eventPositionId], "イベントだけ"),
			),
		).toEqual({ ok: true });
		const overridden = await preferences.getPreferenceOf(eventContext, {
			id: myStaffId,
			name: "",
		});
		expect(overridden.effective).toMatchObject({
			source: "event",
			memo: "イベントだけ",
			positionIds: [eventPositionId],
		});
		// テナントの画面では、イベントの上書きは関係ない
		const tenantView = await preferences.getPreferenceOf(
			await contextOf(staffUser.id, scopes.tenant()),
			{ id: myStaffId, name: "" },
		);
		expect(tenantView.effective.source).toBe("org");

		await preferences.removePreference(eventContext, myStaffId);
		const back = await preferences.getPreferenceOf(eventContext, {
			id: myStaffId,
			name: "",
		});
		expect(back.effective.source).toBe("org");
		expect(back.effective.positionIds).toEqual([]);
	});

	it("決まりに合わない希望は断る（重なり・期間の外・時間粒度・ほかの単位の持ち場・団体全体での持ち場）", async () => {
		const eventContext = await contextOf(staffUser.id, scopes.event());
		const refused = async (scopeContext: typeof eventContext, body: unknown) =>
			expect(
				await preferences.savePreference(scopeContext, myStaffId, body),
			).toMatchObject({ ok: false });
		await refused(
			eventContext,
			input([
				["12:00", "13:00"],
				["12:30", "14:00"],
			]),
		);
		await refused(eventContext, input([["08:00", "10:00"]]));
		await refused(eventContext, input([["12:07", "13:00"]]));
		await refused(eventContext, input([], [tenantPositionId]));
		await refused(eventContext, input([], [eventPositionId, eventPositionId]));
		await refused(eventContext, input([], [], "あ".repeat(201)));
		await refused(
			await contextOf(staffUser.id, scopes.org),
			input([], [eventPositionId]),
		);
		expect(
			await prisma.staffPreference.count({
				where: { staffId: myStaffId, scopeKey: `e:${event.id}` },
			}),
		).toBe(0);
	});

	it("全員の一覧では、スタッフごとに使われる希望と、どこの希望かがわかる", async () => {
		const list = await preferences.listPreferences(
			await contextOf(owner.id, scopes.event()),
		);
		expect(list.map((view) => view.staff.name).sort()).toEqual([
			"オーナーさん",
			"スタッフさん",
		]);
		const mine = list.find((view) => view.staff.id === myStaffId);
		expect(mine?.effective.source).toBe("org");
		expect(
			list.find((view) => view.staff.id === ownerStaffId)?.effective.source,
		).toBeNull();
	});

	it("シフトの単位で使う希望を、スタッフごとにまとめて読める（希望と違う割り当てを見つけるため）", async () => {
		const eventIds = { organizationId, tenantId: tenant.id, eventId: event.id };
		await preferences.savePreference(
			await contextOf(owner.id, scopes.event()),
			myStaffId,
			input([["12:00", "13:00"]], [eventPositionId]),
		);
		const effective = await preferences.loadEffectivePreferences(eventIds, [
			myStaffId,
			ownerStaffId,
		]);
		expect(effective.get(myStaffId)).toMatchObject({
			source: "event",
			positionIds: [eventPositionId],
		});
		expect(effective.get(ownerStaffId)?.source).toBeNull();
	});

	it("ほかの団体の人は、どの単位にも入れない", async () => {
		const outsider = await createUser("p-outsider");
		await expect(contextOf(outsider.id, scopes.org)).rejects.toMatchObject({
			status: 404,
		});
		await expect(contextOf(outsider.id, scopes.event())).rejects.toMatchObject({
			status: 404,
		});
	});
});
