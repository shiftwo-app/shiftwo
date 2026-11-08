// 団体・テナント・イベントどうしのデータの分離、「強い方が勝つ」権限、招待コードを、実際の DB で確かめる。
// DATABASE_URL がない環境（DB を用意していない CI など）では飛ばす
import { afterAll, beforeAll, describe, expect, it } from "vite-plus/test";
import { loadEnvFileIfExists } from "../lib/load-env";

loadEnvFileIfExists();
const hasDatabase = Boolean(process.env.DATABASE_URL);

describe.skipIf(!hasDatabase)(
	"団体・テナント・イベントの分離（DB）",
	async () => {
		const { prisma } = await import("../lib/prisma.server");
		const { findMembership, requireOrgAccess, OrgAccessError } =
			await import("./org-access.server");
		const { findScopeAccess, requireScopeAccess } =
			await import("./scope-access.server");
		const { findShiftBoard } = await import("./shifts.server");
		const { saveShift, removeShift } = await import("./shift-write.server");
		const { acceptInvite, createInvite, createOrganization, previewInvite } =
			await import("./org.server");

		const suffix = crypto.randomUUID().slice(0, 8);
		const userIds: string[] = [];
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

		const users = {} as Record<
			"ownerA" | "ownerB" | "staffA" | "storeManager" | "eventLeader",
			{ id: string }
		>;
		const orgs = {} as Record<"a" | "b", { id: string; slug: string }>;
		/** テナント a1（イベント e1 あり）・a2 は団体 a、b1 は団体 b */
		const tenants = {} as Record<
			"a1" | "a2" | "b1",
			{ id: string; slug: string }
		>;
		let eventE1: { id: string; slug: string };
		const ids = {
			staffA: "",
			staffB: "",
			dailyRoleA1: "",
			dailyRoleA2: "",
			eventRoleE1: "",
			dailyRoleB1: "",
			dailyShiftA1: "",
			dailyShiftA2: "",
			eventShiftE1: "",
			dailyShiftB1: "",
		};

		const shiftInput = (staffId: string, roleId: string, status = "draft") => ({
			staffId,
			roleId,
			timeRange: {
				start: "2026-11-20T09:00:00+09:00",
				end: "2026-11-20T12:00:00+09:00",
			},
			isPreferredRole: true,
			status,
		});
		const timeRange = {
			start: "2026-11-20T00:00:00.000Z",
			end: "2026-11-20T03:00:00.000Z",
		};

		beforeAll(async () => {
			users.ownerA = await createUser("owner-a");
			users.ownerB = await createUser("owner-b");
			users.staffA = await createUser("staff-a");
			users.storeManager = await createUser("store-manager");
			users.eventLeader = await createUser("event-leader");

			for (const key of ["a", "b"] as const) {
				const result = await createOrganization({
					userId: (key === "a" ? users.ownerA : users.ownerB).id,
					name: `テスト団体 ${key}`,
					slug: `test-${key}-${suffix}`,
					displayName: `オーナー ${key}`,
				});
				if (!result.ok) throw new Error(result.errors.join());
				orgs[key] = await prisma.organization.findUniqueOrThrow({
					where: { slug: result.slug },
				});
			}
			// 団体を作ると既定のテナント（main）が 1 つできる
			tenants.a1 = await prisma.tenant.findFirstOrThrow({
				where: { organizationId: orgs.a.id, slug: "main" },
			});
			tenants.b1 = await prisma.tenant.findFirstOrThrow({
				where: { organizationId: orgs.b.id, slug: "main" },
			});
			tenants.a2 = await prisma.tenant.create({
				data: {
					organizationId: orgs.a.id,
					slug: "second",
					name: "2 店舗目",
					timeUnitMinutes: 30,
				},
			});
			eventE1 = await prisma.event.create({
				data: {
					organizationId: orgs.a.id,
					tenantId: tenants.a1.id,
					slug: "e1",
					name: "イベント",
					timeUnitMinutes: 5,
				},
			});

			// 団体 a のメンバー：スタッフ 3 人（うち 1 人は a1 の店長、1 人は e1 のリーダー）
			for (const user of [
				users.staffA,
				users.storeManager,
				users.eventLeader,
			]) {
				await prisma.member.create({
					data: {
						organizationId: orgs.a.id,
						userId: user.id,
						role: "staff",
						displayName: "x",
					},
				});
			}
			const memberOf = (userId: string) =>
				prisma.member.findFirstOrThrow({
					where: { organizationId: orgs.a.id, userId },
				});
			await prisma.tenantMember.create({
				data: {
					tenantId: tenants.a1.id,
					memberId: (await memberOf(users.storeManager.id)).id,
					role: "leader",
				},
			});
			await prisma.eventMember.create({
				data: {
					eventId: eventE1.id,
					memberId: (await memberOf(users.eventLeader.id)).id,
					role: "leader",
				},
			});

			const staffA = await prisma.staff.create({
				data: { organizationId: orgs.a.id, name: "A", unavailableTimes: [] },
			});
			const staffB = await prisma.staff.create({
				data: { organizationId: orgs.b.id, name: "B", unavailableTimes: [] },
			});
			ids.staffA = staffA.id;
			ids.staffB = staffB.id;
			const role = (
				organizationId: string,
				tenantId: string,
				eventId: string | null,
			) =>
				prisma.role.create({
					data: {
						organizationId,
						tenantId,
						eventId,
						name: "r",
						color: "#cccccc",
						requiredStaffCount: 1,
					},
				});
			ids.dailyRoleA1 = (await role(orgs.a.id, tenants.a1.id, null)).id;
			ids.dailyRoleA2 = (await role(orgs.a.id, tenants.a2.id, null)).id;
			ids.eventRoleE1 = (await role(orgs.a.id, tenants.a1.id, eventE1.id)).id;
			ids.dailyRoleB1 = (await role(orgs.b.id, tenants.b1.id, null)).id;
			const shift = (
				organizationId: string,
				tenantId: string,
				eventId: string | null,
				staffId: string,
				roleId: string,
			) =>
				prisma.shift.create({
					data: {
						organizationId,
						tenantId,
						eventId,
						staffId,
						roleId,
						timeRange,
						isPreferredRole: true,
						status: "draft",
					},
				});
			ids.dailyShiftA1 = (
				await shift(orgs.a.id, tenants.a1.id, null, ids.staffA, ids.dailyRoleA1)
			).id;
			ids.dailyShiftA2 = (
				await shift(orgs.a.id, tenants.a2.id, null, ids.staffA, ids.dailyRoleA2)
			).id;
			ids.eventShiftE1 = (
				await shift(
					orgs.a.id,
					tenants.a1.id,
					eventE1.id,
					ids.staffA,
					ids.eventRoleE1,
				)
			).id;
			ids.dailyShiftB1 = (
				await shift(orgs.b.id, tenants.b1.id, null, ids.staffB, ids.dailyRoleB1)
			).id;
		});

		afterAll(async () => {
			await prisma.organization.deleteMany({
				where: {
					id: { in: [orgs.a?.id, orgs.b?.id].filter(Boolean) as string[] },
				},
			});
			await prisma.user.deleteMany({ where: { id: { in: userIds } } });
		});

		type Role = "owner" | "leader" | "staff" | "guest";
		const access = (
			role: Role,
			tenant: { id: string } = tenants.a1,
			event: { id: string } | null = null,
			org: { id: string } = orgs.a,
		) => ({
			organizationId: org.id,
			tenantId: tenant.id,
			eventId: event?.id ?? null,
			role,
			timeUnitMinutes: 15,
		});

		describe("団体", () => {
			it("所属していない団体は「存在しない」（404）。所属していれば見られる", async () => {
				expect(await findMembership(users.ownerA.id, orgs.b.slug)).toBeNull();
				await expect(
					requireOrgAccess(users.ownerA.id, orgs.b.slug, "shift.view"),
				).rejects.toMatchObject({
					status: 404,
				});
				await expect(
					requireOrgAccess(users.ownerA.id, orgs.a.slug, "shift.view"),
				).resolves.toMatchObject({
					member: { role: "owner" },
				});
			});

			it("ほかの団体のテナント名・ほかのテナントのイベント名では開けない（404）", async () => {
				// 団体 a のメンバーが、団体 a の URL に団体 b のテナント名を付けても見つからない
				expect(
					await findScopeAccess(users.ownerA.id, {
						orgSlug: orgs.a.slug,
						tenantSlug: "nope",
					}),
				).toBeNull();
				// テナント a2 には e1 はない
				expect(
					await findScopeAccess(users.ownerA.id, {
						orgSlug: orgs.a.slug,
						tenantSlug: tenants.a2.slug,
						eventSlug: eventE1.slug,
					}),
				).toBeNull();
				// 団体 b のテナントは、団体 a のオーナーからは見えない
				await expect(
					requireScopeAccess(
						users.ownerA.id,
						{ orgSlug: orgs.b.slug, tenantSlug: tenants.b1.slug },
						"shift.view",
					),
				).rejects.toMatchObject({ status: 404 });
			});

			it("ほかの団体のスタッフを混ぜられない・ほかの団体のシフトは触れない", async () => {
				expect(
					await saveShift(
						access("owner"),
						shiftInput(ids.staffB, ids.dailyRoleA1),
					),
				).toMatchObject({
					ok: false,
					status: 400,
				});
				expect(
					await removeShift(access("owner"), ids.dailyShiftB1),
				).toMatchObject({ ok: false, status: 404 });
			});
		});

		describe("テナントとイベント", () => {
			it("日常シフトの一覧には、そのテナントの日常シフトと日常の役割だけが入る（イベントのシフトは入らない）", async () => {
				const board = await findShiftBoard(
					{ organizationId: orgs.a.id, tenantId: tenants.a1.id, eventId: null },
					"draft" as never,
				);
				expect(board.shifts.map((s) => s.id)).toEqual([ids.dailyShiftA1]);
				expect(board.roles.map((r) => r.id)).toEqual([ids.dailyRoleA1]);
				expect(board.staffs.map((s) => s.id)).toEqual([ids.staffA]); // スタッフは団体全体
			});

			it("イベントの一覧には、そのイベントのシフトとイベントの役割だけが入る", async () => {
				const board = await findShiftBoard(
					{
						organizationId: orgs.a.id,
						tenantId: tenants.a1.id,
						eventId: eventE1.id,
					},
					"draft" as never,
				);
				expect(board.shifts.map((s) => s.id)).toEqual([ids.eventShiftE1]);
				expect(board.roles.map((r) => r.id)).toEqual([ids.eventRoleE1]);
			});

			it("日常シフトにイベントの役割は使えず、イベントに日常の役割は使えない。ほかのテナントの役割も使えない", async () => {
				expect(
					await saveShift(
						access("owner"),
						shiftInput(ids.staffA, ids.eventRoleE1),
					),
				).toMatchObject({
					ok: false,
					status: 400,
				});
				expect(
					await saveShift(
						access("owner", tenants.a1, eventE1),
						shiftInput(ids.staffA, ids.dailyRoleA1),
					),
				).toMatchObject({ ok: false, status: 400 });
				expect(
					await saveShift(
						access("owner"),
						shiftInput(ids.staffA, ids.dailyRoleA2),
					),
				).toMatchObject({
					ok: false,
					status: 400,
				});
			});

			it("ほかのテナント・日常とイベントをまたいでシフトを変えたり消したりできない（404）", async () => {
				expect(
					await saveShift(
						access("owner"),
						shiftInput(ids.staffA, ids.dailyRoleA1),
						ids.dailyShiftA2,
					),
				).toMatchObject({ ok: false, status: 404 });
				expect(
					await removeShift(access("owner"), ids.eventShiftE1),
				).toMatchObject({ ok: false, status: 404 });
				expect(
					await removeShift(
						access("owner", tenants.a1, eventE1),
						ids.dailyShiftA1,
					),
				).toMatchObject({
					ok: false,
					status: 404,
				});
			});

			it("イベントで作ったシフトはイベントに、日常シフトで作ったシフトはイベントなしで保存される", async () => {
				const daily = await saveShift(
					access("owner"),
					shiftInput(ids.staffA, ids.dailyRoleA1),
				);
				expect(daily).toMatchObject({
					ok: true,
					shift: { tenantId: tenants.a1.id, eventId: null },
				});
				const evented = await saveShift(
					{ ...access("owner", tenants.a1, eventE1), timeUnitMinutes: 5 },
					shiftInput(ids.staffA, ids.eventRoleE1),
				);
				expect(evented).toMatchObject({
					ok: true,
					shift: { tenantId: tenants.a1.id, eventId: eventE1.id },
				});
			});

			it("時間粒度はイベントの上書きがあればそれ、なければテナントの値", async () => {
				const daily = await findScopeAccess(users.ownerA.id, {
					orgSlug: orgs.a.slug,
					tenantSlug: tenants.a1.slug,
				});
				const evented = await findScopeAccess(users.ownerA.id, {
					orgSlug: orgs.a.slug,
					tenantSlug: tenants.a1.slug,
					eventSlug: eventE1.slug,
				});
				expect(daily?.timeUnitMinutes).toBe(15); // 既定のテナント
				expect(evented?.timeUnitMinutes).toBe(5);
			});
		});

		describe("強い方が勝つ（団体・テナント・イベントの役割）", () => {
			const roleAt = async (
				userId: string,
				tenantSlug: string,
				eventSlug?: string,
			) =>
				(
					await findScopeAccess(userId, {
						orgSlug: orgs.a.slug,
						tenantSlug,
						eventSlug,
					})
				)?.role;

			it("テナントの店長は、そのテナントとその下のイベントでリーダー。ほかのテナントではスタッフ", async () => {
				expect(await roleAt(users.storeManager.id, tenants.a1.slug)).toBe(
					"leader",
				);
				expect(
					await roleAt(users.storeManager.id, tenants.a1.slug, eventE1.slug),
				).toBe("leader");
				expect(await roleAt(users.storeManager.id, tenants.a2.slug)).toBe(
					"staff",
				);
			});

			it("イベントのリーダーは、そのイベントだけでリーダー。日常シフトではスタッフ", async () => {
				expect(
					await roleAt(users.eventLeader.id, tenants.a1.slug, eventE1.slug),
				).toBe("leader");
				expect(await roleAt(users.eventLeader.id, tenants.a1.slug)).toBe(
					"staff",
				);
			});

			it("割り当てのないスタッフはどこでもスタッフで、書き込めない", async () => {
				expect(await roleAt(users.staffA.id, tenants.a1.slug)).toBe("staff");
				const error = await requireScopeAccess(
					users.staffA.id,
					{ orgSlug: orgs.a.slug, tenantSlug: tenants.a1.slug },
					"shift.edit",
				).catch((e) => e);
				expect(error).toBeInstanceOf(OrgAccessError);
				expect(error.status).toBe(403);
			});

			it("スタッフ・ゲストは書き込めず、リーダーは確定にできる", async () => {
				expect(
					await saveShift(
						access("staff"),
						shiftInput(ids.staffA, ids.dailyRoleA1),
					),
				).toMatchObject({
					status: 403,
				});
				expect(
					await saveShift(
						access("guest"),
						shiftInput(ids.staffA, ids.dailyRoleA1),
					),
				).toMatchObject({
					status: 403,
				});
				expect(
					await saveShift(
						access("leader"),
						shiftInput(ids.staffA, ids.dailyRoleA1, "confirmed"),
					),
				).toMatchObject({ ok: true, shift: { status: "confirmed" } });
			});
		});

		describe("招待コード", () => {
			it("使うと、決めた役割と表示名で参加する。1 回きりのコードは 2 回目に使えない", async () => {
				const invite = await createInvite({
					organizationId: orgs.b.id,
					createdById: users.ownerB.id,
					role: "guest",
					maxUses: 1,
					expiresInDays: 7,
				});
				expect(
					await previewInvite(users.ownerA.id, invite.code.toLowerCase()),
				).toMatchObject({
					ok: true,
					organizationSlug: orgs.b.slug,
					role: "guest",
					alreadyMember: false,
				});
				expect(
					await acceptInvite({
						userId: users.ownerA.id,
						code: invite.code,
						displayName: "ゲストのA",
					}),
				).toEqual({
					ok: true,
					slug: orgs.b.slug,
				});
				expect(
					await findMembership(users.ownerA.id, orgs.b.slug),
				).toMatchObject({
					member: { role: "guest", displayName: "ゲストのA" },
				});
				expect(
					await acceptInvite({
						userId: users.staffA.id,
						code: invite.code,
						displayName: "x",
					}),
				).toEqual({
					ok: false,
					reason: "used_up",
				});
				await prisma.member.deleteMany({
					where: { organizationId: orgs.b.id, userId: users.ownerA.id },
				});
			});

			it("取り消し・期限切れ・すでにメンバー・ないコードを見分ける", async () => {
				const make = (expiresInDays: number, now?: Date) =>
					createInvite({
						organizationId: orgs.b.id,
						createdById: users.ownerB.id,
						role: "staff",
						maxUses: null,
						expiresInDays,
						now,
					});
				const revoked = await make(7);
				await prisma.invite.update({
					where: { id: revoked.id },
					data: { revokedAt: new Date() },
				});
				expect(
					await acceptInvite({
						userId: users.ownerA.id,
						code: revoked.code,
						displayName: "x",
					}),
				).toEqual({
					ok: false,
					reason: "revoked",
				});
				const expired = await make(1, new Date("2020-01-01T00:00:00Z"));
				expect(
					await acceptInvite({
						userId: users.ownerA.id,
						code: expired.code,
						displayName: "x",
					}),
				).toEqual({
					ok: false,
					reason: "expired",
				});
				const open = await make(7);
				expect(
					await acceptInvite({
						userId: users.ownerB.id,
						code: open.code,
						displayName: "x",
					}),
				).toEqual({
					ok: false,
					reason: "already_member",
				});
				expect(
					await acceptInvite({
						userId: users.ownerA.id,
						code: "ZZZZZZZZ",
						displayName: "x",
					}),
				).toEqual({
					ok: false,
					reason: "not_found",
				});
			});

			it("同時に使われても、使える回数を超えて参加させない", async () => {
				const invite = await createInvite({
					organizationId: orgs.a.id,
					createdById: users.ownerA.id,
					role: "staff",
					maxUses: 1,
					expiresInDays: 7,
				});
				const racers = await Promise.all([
					createUser("racer-1"),
					createUser("racer-2"),
					createUser("racer-3"),
				]);
				const results = await Promise.all(
					racers.map((user) =>
						acceptInvite({
							userId: user.id,
							code: invite.code,
							displayName: "racer",
						}).catch(() => ({
							ok: false as const,
							reason: "error",
						})),
					),
				);
				expect(results.filter((r) => r.ok)).toHaveLength(1);
				expect(
					(await prisma.invite.findUniqueOrThrow({ where: { id: invite.id } }))
						.uses,
				).toBe(1);
			});
		});
	},
);
