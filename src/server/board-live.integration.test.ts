// シフト以外の変更（持ち場・スタッフ・タイムテーブル・設定・希望）を、開いているシフトの画面に知らせることを、実際の DB で確かめる。
// DATABASE_URL がない環境では飛ばす
import { afterAll, beforeAll, describe, expect, it, vi } from "vite-plus/test";
import { loadEnvFileIfExists } from "../lib/load-env";

loadEnvFileIfExists();
const hasDatabase = Boolean(process.env.DATABASE_URL);

describe.skipIf(!hasDatabase)(
	"シフトの画面への変更の知らせ（DB）",
	async () => {
		const { platform } = await import("#platform");
		const { prisma } = await import("../lib/prisma.server");
		const { shiftBoardChannel } = await import("../lib/shift-board-live");
		const org = await import("./org.server");
		const manage = await import("./manage.server");
		const timetable = await import("./timetable.server");

		const suffix = crypto.randomUUID().slice(0, 8);
		let userId = "";
		let organizationId = "";
		let orgSlug = "";
		let tenant = { id: "", slug: "" };
		let otherTenantId = "";
		let eventId = "";

		/** 応答のあとに送る分を待ってから、送った先と中身を返す */
		const published = async (spy: { mock: { calls: unknown[][] } }) => {
			await new Promise((resolve) => setTimeout(resolve, 0));
			return spy.mock.calls.map(([channel, message]) => ({
				channel,
				event: JSON.parse(message as string) as unknown,
			}));
		};

		const watch = async (run: () => Promise<unknown>) => {
			const spy = vi.spyOn(platform.realtime, "publish");
			try {
				await run();
				return await published(spy);
			} finally {
				spy.mockRestore();
			}
		};

		const daily = (tenantId: string) => ({
			organizationId,
			tenantId,
			eventId: null,
		});

		beforeAll(async () => {
			const user = await prisma.user.create({
				data: {
					id: crypto.randomUUID(),
					email: `board-live-${suffix}@example.com`,
					name: "b",
					emailVerified: true,
				},
			});
			userId = user.id;
			const created = await org.createOrganization({
				userId,
				name: "知らせの団体",
				slug: `bl-${suffix}`,
				displayName: "b",
			});
			if (!created.ok) throw new Error(created.errors.join());
			orgSlug = created.slug;
			organizationId = (
				await prisma.organization.findUniqueOrThrow({
					where: { slug: orgSlug },
				})
			).id;
			tenant = await prisma.tenant.findFirstOrThrow({
				where: { organizationId },
				select: { id: true, slug: true },
			});
			otherTenantId = (
				await prisma.tenant.create({
					data: {
						organizationId,
						slug: "second",
						name: "2 つ目",
						timeUnitMinutes: 15,
					},
				})
			).id;
			eventId = (
				await prisma.event.create({
					data: {
						organizationId,
						tenantId: tenant.id,
						slug: "conf",
						name: "conf",
					},
				})
			).id;
		});

		afterAll(async () => {
			await prisma.organization.deleteMany({ where: { id: organizationId } });
			await prisma.user.deleteMany({ where: { id: userId } });
		});

		it("持ち場の変更は、その単位の画面だけに知らせる（見つからなければ知らせない）", async () => {
			const scope = { organizationId, tenantId: tenant.id, eventId };
			const input = {
				name: "受付",
				color: "#6FB3AE",
				requiredStaffCount: 1,
				isBreak: false,
				staffingRules: [],
			};
			expect(await watch(() => manage.createPosition(scope, input))).toEqual([
				{
					channel: shiftBoardChannel(scope),
					event: { type: "board.changed", reason: "positions" },
				},
			]);
			expect(
				await watch(() =>
					manage.updatePosition(scope, crypto.randomUUID(), input),
				),
			).toEqual([]);
		});

		it("スタッフの変更は、団体のすべての画面（テナントごとの日常シフトとイベント）に知らせる", async () => {
			const events = await watch(() =>
				manage.createStaff(organizationId, { name: "山田", memberId: null }),
			);
			const channels = events.map((item) => item.channel);
			expect(new Set(channels)).toEqual(
				new Set([
					shiftBoardChannel(daily(tenant.id)),
					shiftBoardChannel(daily(otherTenantId)),
					shiftBoardChannel({ organizationId, tenantId: tenant.id, eventId }),
				]),
			);
			expect(channels).toHaveLength(new Set(channels).size);
			expect(new Set(events.map((item) => JSON.stringify(item.event)))).toEqual(
				new Set([JSON.stringify({ type: "board.changed", reason: "staff" })]),
			);
		});

		it("テナントの設定の変更は、そのテナントの日常シフトとイベントに知らせる", async () => {
			const events = await watch(() =>
				manage.updateTenant(organizationId, tenant.id, {
					slug: tenant.slug,
					name: "1 つ目",
					timeUnitMinutes: 30,
				}),
			);
			const channels = events.map((item) => item.channel);
			expect(new Set(channels)).toEqual(
				new Set([
					shiftBoardChannel(daily(tenant.id)),
					shiftBoardChannel({ organizationId, tenantId: tenant.id, eventId }),
				]),
			);
			expect(channels).toHaveLength(new Set(channels).size);
		});

		it("タイムテーブルの取り込みは、そのイベントの画面に知らせる", async () => {
			const access = await timetable.requireTimetableAccess(
				userId,
				{ orgSlug, tenantSlug: tenant.slug, eventSlug: "conf" },
				"event.manage",
			);
			const events = await watch(() =>
				timetable.importTimetable(access, {
					content:
						"title,speaker,room,start,end\n基調講演,山田,A,2026-11-20 10:00,2026-11-20 11:00",
					format: "csv",
					fileName: "t.csv",
					apply: true,
				}),
			);
			expect(events).toEqual([
				{
					channel: shiftBoardChannel({
						organizationId,
						tenantId: tenant.id,
						eventId,
					}),
					event: { type: "board.changed", reason: "timetable" },
				},
			]);
		});
	},
);
