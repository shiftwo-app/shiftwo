// 団体・テナント・イベントどうしのデータの分離、ロール（権限の足し合わせ・乗っ取り防止）、招待コードを、
// 実際の DB で確かめる。DATABASE_URL がない環境（DB を用意していない CI など）では飛ばす
import { afterAll, beforeAll, describe, expect, it } from "vite-plus/test";
import { loadEnvFileIfExists } from "../lib/load-env";
import type { Permission } from "../lib/org/permissions";

loadEnvFileIfExists();
const hasDatabase = Boolean(process.env.DATABASE_URL);

describe.skipIf(!hasDatabase)(
	"団体・テナント・イベントの分離とロール（DB）",
	async () => {
		const { prisma } = await import("../lib/prisma.server");
		const { ALL_PERMISSIONS } = await import("../lib/org/permissions");
		const { findMembership, requireOrgAccess, OrgAccessError } =
			await import("./org-access.server");
		const { findScopeAccess, requireScopeAccess } =
			await import("./scope-access.server");
		const { findShiftBoard } = await import("./shifts.server");
		const { saveShift, removeShift } = await import("./shift-write.server");
		const org = await import("./org.server");

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

		type Key =
			| "ownerA"
			| "ownerB"
			| "leaderA"
			| "staffA"
			| "storeManager"
			| "eventLeader";
		const users = {} as Record<Key, { id: string }>;
		const members = {} as Record<Key, { id: string }>;
		const orgs = {} as Record<"a" | "b", { id: string; slug: string }>;
		const roleIdsA = {} as Record<
			"manager" | "leader" | "staff" | "guest",
			string
		>;
		const tenants = {} as Record<
			"a1" | "a2" | "b1",
			{ id: string; slug: string }
		>;
		let eventE1: { id: string; slug: string };
		const ids = {
			staffA: "",
			staffB: "",
			dailyPositionA1: "",
			dailyPositionA2: "",
			eventPositionE1: "",
			dailyPositionB1: "",
			dailyShiftA1: "",
			dailyShiftA2: "",
			eventShiftE1: "",
			dailyShiftB1: "",
		};

		const shiftInput = (
			staffId: string,
			positionId: string,
			status = "draft",
		) => ({
			staffId,
			positionId,
			timeRange: {
				start: "2026-11-20T09:00:00+09:00",
				end: "2026-11-20T12:00:00+09:00",
			},
			isPreferredPosition: true,
			status,
		});
		const timeRange = {
			start: "2026-11-20T00:00:00.000Z",
			end: "2026-11-20T03:00:00.000Z",
		};

		/** その人の団体での操作者（requireOrgAccess で得られるもの） */
		const actorOf = async (key: Key, slug = orgs.a.slug) => {
			const membership = await findMembership(users[key].id, slug);
			if (!membership) throw new Error(`not a member: ${key}`);
			return {
				memberId: membership.member.id,
				isOwner: membership.member.isOwner,
				permissions: membership.member.permissions,
			};
		};

		beforeAll(async () => {
			for (const key of [
				"ownerA",
				"ownerB",
				"leaderA",
				"staffA",
				"storeManager",
				"eventLeader",
			] as const) {
				users[key] = await createUser(key);
			}
			for (const key of ["a", "b"] as const) {
				const result = await org.createOrganization({
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
			const roles = await prisma.orgRole.findMany({
				where: { organizationId: orgs.a.id },
			});
			const byName = Object.fromEntries(roles.map((r) => [r.name, r.id]));
			roleIdsA.manager = byName["マネージャー"];
			roleIdsA.leader = byName["リーダー"];
			roleIdsA.staff = byName["スタッフ"];
			roleIdsA.guest = byName["ゲスト"];

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

			members.ownerA = await prisma.member.findFirstOrThrow({
				where: { organizationId: orgs.a.id, userId: users.ownerA.id },
			});
			const addMember = (key: Key, roleId: string) =>
				prisma.member.create({
					data: {
						organizationId: orgs.a.id,
						userId: users[key].id,
						displayName: key,
						roles: { create: { roleId } },
					},
				});
			members.leaderA = await addMember("leaderA", roleIdsA.leader);
			members.staffA = await addMember("staffA", roleIdsA.staff);
			members.storeManager = await addMember("storeManager", roleIdsA.staff);
			members.eventLeader = await addMember("eventLeader", roleIdsA.staff);
			// テナント a1 で店長（リーダーのロール）、イベント e1 でリーダー
			await prisma.tenantMember.create({
				data: {
					tenantId: tenants.a1.id,
					memberId: members.storeManager.id,
					roleId: roleIdsA.leader,
				},
			});
			await prisma.eventMember.create({
				data: {
					eventId: eventE1.id,
					memberId: members.eventLeader.id,
					roleId: roleIdsA.leader,
				},
			});
			// テナントで割り当てたロールに団体全体の権限（メンバーの管理）が入っていても、上乗せされないことを確かめる用
			await prisma.tenantMember.create({
				data: {
					tenantId: tenants.a1.id,
					memberId: members.storeManager.id,
					roleId: roleIdsA.manager,
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
			const position = (
				organizationId: string,
				tenantId: string,
				eventId: string | null,
			) =>
				prisma.position.create({
					data: {
						organizationId,
						tenantId,
						eventId,
						name: "p",
						color: "#cccccc",
						requiredStaffCount: 1,
					},
				});
			ids.dailyPositionA1 = (await position(orgs.a.id, tenants.a1.id, null)).id;
			ids.dailyPositionA2 = (await position(orgs.a.id, tenants.a2.id, null)).id;
			ids.eventPositionE1 = (
				await position(orgs.a.id, tenants.a1.id, eventE1.id)
			).id;
			ids.dailyPositionB1 = (await position(orgs.b.id, tenants.b1.id, null)).id;
			const shift = (
				organizationId: string,
				tenantId: string,
				eventId: string | null,
				staffId: string,
				positionId: string,
			) =>
				prisma.shift.create({
					data: {
						organizationId,
						tenantId,
						eventId,
						staffId,
						positionId,
						timeRange,
						isPreferredPosition: true,
						status: "draft",
					},
				});
			ids.dailyShiftA1 = (
				await shift(
					orgs.a.id,
					tenants.a1.id,
					null,
					ids.staffA,
					ids.dailyPositionA1,
				)
			).id;
			ids.dailyShiftA2 = (
				await shift(
					orgs.a.id,
					tenants.a2.id,
					null,
					ids.staffA,
					ids.dailyPositionA2,
				)
			).id;
			ids.eventShiftE1 = (
				await shift(
					orgs.a.id,
					tenants.a1.id,
					eventE1.id,
					ids.staffA,
					ids.eventPositionE1,
				)
			).id;
			ids.dailyShiftB1 = (
				await shift(
					orgs.b.id,
					tenants.b1.id,
					null,
					ids.staffB,
					ids.dailyPositionB1,
				)
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

		const editor: Permission[] = ["shift.view", "shift.edit", "shift.confirm"];
		const access = (
			permissions: Permission[],
			tenant: { id: string } = tenants.a1,
			event: { id: string } | null = null,
		) => ({
			organizationId: orgs.a.id,
			tenantId: tenant.id,
			eventId: event?.id ?? null,
			permissions,
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
					member: { isOwner: true },
				});
			});

			it("団体を作ると、最初のロール 4 つとテナントができ、作った人はオーナー（全権限）", async () => {
				const roles = await prisma.orgRole.findMany({
					where: { organizationId: orgs.a.id },
					orderBy: { sortOrder: "asc" },
				});
				expect(roles.slice(0, 4).map((r) => r.name)).toEqual([
					"マネージャー",
					"リーダー",
					"スタッフ",
					"ゲスト",
				]);
				const owner = await findMembership(users.ownerA.id, orgs.a.slug);
				expect(owner?.member.permissions).toEqual(ALL_PERMISSIONS);
			});

			it("ほかの団体のテナント名・ほかのテナントのイベント名では開けない（404）", async () => {
				expect(
					await findScopeAccess(users.ownerA.id, {
						orgSlug: orgs.a.slug,
						tenantSlug: "nope",
					}),
				).toBeNull();
				expect(
					await findScopeAccess(users.ownerA.id, {
						orgSlug: orgs.a.slug,
						tenantSlug: tenants.a2.slug,
						eventSlug: eventE1.slug,
					}),
				).toBeNull();
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
						access(editor),
						shiftInput(ids.staffB, ids.dailyPositionA1),
					),
				).toMatchObject({
					ok: false,
					status: 400,
				});
				expect(
					await removeShift(access(editor), ids.dailyShiftB1),
				).toMatchObject({ ok: false, status: 404 });
			});
		});

		describe("テナントとイベント", () => {
			it("日常シフトの一覧には、そのテナントの日常シフトと日常の持ち場だけが入る（イベントのシフトは入らない）", async () => {
				const board = await findShiftBoard(
					{ organizationId: orgs.a.id, tenantId: tenants.a1.id, eventId: null },
					"draft" as never,
				);
				expect(board.shifts.map((s) => s.id)).toEqual([ids.dailyShiftA1]);
				expect(board.positions.map((r) => r.id)).toEqual([ids.dailyPositionA1]);
				expect(board.staffs.map((s) => s.id)).toEqual([ids.staffA]);
			});

			it("イベントの一覧には、そのイベントのシフトとイベントの持ち場だけが入る", async () => {
				const board = await findShiftBoard(
					{
						organizationId: orgs.a.id,
						tenantId: tenants.a1.id,
						eventId: eventE1.id,
					},
					"draft" as never,
				);
				expect(board.shifts.map((s) => s.id)).toEqual([ids.eventShiftE1]);
				expect(board.positions.map((r) => r.id)).toEqual([ids.eventPositionE1]);
			});

			it("日常シフトにイベントの持ち場は使えず、イベントに日常の持ち場は使えない。ほかのテナントの持ち場も使えない", async () => {
				expect(
					await saveShift(
						access(editor),
						shiftInput(ids.staffA, ids.eventPositionE1),
					),
				).toMatchObject({
					status: 400,
				});
				expect(
					await saveShift(
						access(editor, tenants.a1, eventE1),
						shiftInput(ids.staffA, ids.dailyPositionA1),
					),
				).toMatchObject({ status: 400 });
				expect(
					await saveShift(
						access(editor),
						shiftInput(ids.staffA, ids.dailyPositionA2),
					),
				).toMatchObject({
					status: 400,
				});
			});

			it("ほかのテナント・日常とイベントをまたいでシフトを変えたり消したりできない（404）", async () => {
				expect(
					await saveShift(
						access(editor),
						shiftInput(ids.staffA, ids.dailyPositionA1),
						ids.dailyShiftA2,
					),
				).toMatchObject({ status: 404 });
				expect(
					await removeShift(access(editor), ids.eventShiftE1),
				).toMatchObject({ status: 404 });
				expect(
					await removeShift(
						access(editor, tenants.a1, eventE1),
						ids.dailyShiftA1,
					),
				).toMatchObject({
					status: 404,
				});
			});

			it("イベントで作ったシフトはイベントに、日常シフトで作ったシフトはイベントなしで保存される", async () => {
				expect(
					await saveShift(
						access(editor),
						shiftInput(ids.staffA, ids.dailyPositionA1),
					),
				).toMatchObject({
					ok: true,
					shift: { tenantId: tenants.a1.id, eventId: null },
				});
				expect(
					await saveShift(
						{ ...access(editor, tenants.a1, eventE1), timeUnitMinutes: 5 },
						shiftInput(ids.staffA, ids.eventPositionE1),
					),
				).toMatchObject({ ok: true, shift: { eventId: eventE1.id } });
			});

			it("時間粒度はイベントの上書きがあればそれ、なければテナントの値", async () => {
				const scope = { orgSlug: orgs.a.slug, tenantSlug: tenants.a1.slug };
				expect(
					(await findScopeAccess(users.ownerA.id, scope))?.timeUnitMinutes,
				).toBe(15);
				expect(
					(
						await findScopeAccess(users.ownerA.id, {
							...scope,
							eventSlug: eventE1.slug,
						})
					)?.timeUnitMinutes,
				).toBe(5);
			});
		});

		describe("ロール（権限の足し合わせ）", () => {
			const permsAt = async (
				key: Key,
				tenantSlug: string,
				eventSlug?: string,
			) =>
				(
					await findScopeAccess(users[key].id, {
						orgSlug: orgs.a.slug,
						tenantSlug,
						eventSlug,
					})
				)?.permissions ?? [];

			it("テナントで割り当てたロールの権限は、そのテナントと下のイベントで上乗せされる。ほかのテナントでは効かない", async () => {
				expect(await permsAt("storeManager", tenants.a1.slug)).toContain(
					"shift.edit",
				);
				expect(
					await permsAt("storeManager", tenants.a1.slug, eventE1.slug),
				).toContain("shift.edit");
				expect(await permsAt("storeManager", tenants.a2.slug)).not.toContain(
					"shift.edit",
				);
			});

			it("テナント・イベントのロールからは、団体全体の権限（メンバーの管理など）は上乗せされない", async () => {
				const perms = await permsAt("storeManager", tenants.a1.slug);
				expect(perms).not.toContain("member.manage");
				expect(perms).not.toContain("role.manage");
				await expect(
					requireOrgAccess(users.storeManager.id, orgs.a.slug, "member.manage"),
				).rejects.toMatchObject({
					status: 403,
				});
			});

			it("イベントで割り当てたロールは、そのイベントだけで効く", async () => {
				expect(
					await permsAt("eventLeader", tenants.a1.slug, eventE1.slug),
				).toContain("shift.edit");
				expect(await permsAt("eventLeader", tenants.a1.slug)).not.toContain(
					"shift.edit",
				);
			});

			it("割り当てのないスタッフは書き込めない（403）", async () => {
				const error = await requireScopeAccess(
					users.staffA.id,
					{ orgSlug: orgs.a.slug, tenantSlug: tenants.a1.slug },
					"shift.edit",
				).catch((e) => e);
				expect(error).toBeInstanceOf(OrgAccessError);
				expect(error.status).toBe(403);
			});

			it("シフトの編集・確定は権限の項目で決まる", async () => {
				expect(
					await saveShift(
						access(["shift.view"]),
						shiftInput(ids.staffA, ids.dailyPositionA1),
					),
				).toMatchObject({
					status: 403,
				});
				expect(
					await saveShift(
						access(["shift.view", "shift.edit"]),
						shiftInput(ids.staffA, ids.dailyPositionA1, "confirmed"),
					),
				).toMatchObject({ status: 403 });
				expect(
					await saveShift(
						access(editor),
						shiftInput(ids.staffA, ids.dailyPositionA1, "confirmed"),
					),
				).toMatchObject({ ok: true, shift: { status: "confirmed" } });
			});

			it("1 人が複数のロールを持てて、権限は足し合わせになる", async () => {
				const owner = await actorOf("ownerA");
				const result = await org.setMemberRoles(
					orgs.a.id,
					owner,
					members.staffA.id,
					[roleIdsA.staff, roleIdsA.guest],
				);
				expect(result).toEqual({ ok: true });
				const perms = (await findMembership(users.staffA.id, orgs.a.slug))
					?.member.permissions;
				expect(perms).toContain("guild.bypass"); // ゲスト
				expect(perms).toContain("shift.view"); // スタッフ・ゲスト
				await org.setMemberRoles(orgs.a.id, owner, members.staffA.id, [
					roleIdsA.staff,
				]);
			});
		});

		describe("権限の乗っ取り防止", () => {
			it("リーダーは、自分にない権限を含むロールを作れない・変えられない・消せない", async () => {
				const leader = await actorOf("leaderA");
				expect(
					await org.createRole(orgs.a.id, leader, {
						name: "x",
						color: "#000000",
						permissions: ["member.manage"],
					}),
				).toMatchObject({ ok: false });
				expect(
					await org.updateRole(orgs.a.id, leader, roleIdsA.manager, {
						name: "乗っ取り",
						color: "#000000",
						permissions: ["shift.view"],
					}),
				).toMatchObject({ ok: false });
				expect(
					await org.deleteRole(orgs.a.id, leader, roleIdsA.manager),
				).toMatchObject({ ok: false });
				// 自分の持つ権限の範囲なら作れる
				expect(
					await org.createRole(orgs.a.id, leader, {
						name: "受付係",
						color: "#123456",
						permissions: ["shift.view"],
					}),
				).toMatchObject({ ok: true });
			});

			it("自分にない権限を含むロールは、人に付けられず、外すこともできない。招待コードでも渡せない", async () => {
				const leader = await actorOf("leaderA");
				expect(
					await org.setMemberRoles(orgs.a.id, leader, members.staffA.id, [
						roleIdsA.staff,
						roleIdsA.manager,
					]),
				).toMatchObject({ ok: false });
				// 自分自身にマネージャーを付けることもできない
				expect(
					await org.setMemberRoles(orgs.a.id, leader, members.leaderA.id, [
						roleIdsA.leader,
						roleIdsA.manager,
					]),
				).toMatchObject({ ok: false });
				expect(
					await org.createInvite({
						organizationId: orgs.a.id,
						actor: leader,
						createdById: users.leaderA.id,
						roleId: roleIdsA.manager,
						maxUses: 1,
						expiresInDays: 7,
					}),
				).toMatchObject({ ok: false });
			});

			it("「ゲストを招待する」を持つリーダーは、ゲストの招待コードを発行できる。ほかの例外はない", async () => {
				const leader = await actorOf("leaderA");
				const invite = (roleId: string) =>
					org.createInvite({
						organizationId: orgs.a.id,
						actor: leader,
						createdById: users.leaderA.id,
						roleId,
						maxUses: 1,
						expiresInDays: 7,
					});
				expect(await invite(roleIdsA.guest)).toMatchObject({ ok: true });
				// 招待以外（メンバーへのロールの付け外し）では、Discord の条件の免除を渡せない
				expect(
					await org.setMemberRoles(orgs.a.id, leader, members.staffA.id, [
						roleIdsA.staff,
						roleIdsA.guest,
					]),
				).toMatchObject({ ok: false });
				// 免除のほかに自分にない権限（メンバーの管理）を含むロールは、招待でも渡せない
				const owner = await actorOf("ownerA");
				const created = await org.createRole(orgs.a.id, owner, {
					name: "免除＋管理",
					color: "#000000",
					permissions: ["guild.bypass", "member.manage"],
				});
				if (!created.ok) throw new Error(created.errors.join());
				expect(await invite(created.id)).toMatchObject({ ok: false });
			});

			it("オーナーのロールは変えられない。ほかの団体のロールは付けられない", async () => {
				const owner = await actorOf("ownerA");
				expect(
					await org.setMemberRoles(orgs.a.id, owner, members.ownerA.id, []),
				).toMatchObject({ ok: false });
				const roleOfB = await prisma.orgRole.findFirstOrThrow({
					where: { organizationId: orgs.b.id },
				});
				expect(
					await org.setMemberRoles(orgs.a.id, owner, members.staffA.id, [
						roleOfB.id,
					]),
				).toMatchObject({
					ok: false,
				});
			});
		});

		describe("招待コード", () => {
			const inviteB = async (
				roleName: string,
				maxUses: number | null,
				expiresInDays = 7,
				now?: Date,
			) => {
				const role = await prisma.orgRole.findFirstOrThrow({
					where: { organizationId: orgs.b.id, name: roleName },
				});
				const result = await org.createInvite({
					organizationId: orgs.b.id,
					actor: await actorOf("ownerB", orgs.b.slug),
					createdById: users.ownerB.id,
					roleId: role.id,
					maxUses,
					expiresInDays,
					now,
				});
				if (!result.ok) throw new Error(result.errors.join());
				return result.code;
			};

			it("使うと、そのロールと表示名で参加する。1 回きりのコードは 2 回目に使えない", async () => {
				const code = await inviteB("ゲスト", 1);
				expect(
					await org.previewInvite(users.ownerA.id, code.toLowerCase()),
				).toMatchObject({
					ok: true,
					organizationSlug: orgs.b.slug,
					roleName: "ゲスト",
					alreadyMember: false,
				});
				expect(
					await org.acceptInvite({
						userId: users.ownerA.id,
						code,
						displayName: "ゲストのA",
					}),
				).toEqual({
					ok: true,
					slug: orgs.b.slug,
				});
				const joined = await findMembership(users.ownerA.id, orgs.b.slug);
				expect(joined?.member).toMatchObject({
					isOwner: false,
					displayName: "ゲストのA",
				});
				expect(joined?.member.roles.map((r) => r.name)).toEqual(["ゲスト"]);
				expect(
					await org.acceptInvite({
						userId: users.staffA.id,
						code,
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
				const revoked = await inviteB("スタッフ", null);
				await prisma.invite.update({
					where: { code: revoked },
					data: { revokedAt: new Date() },
				});
				expect(
					await org.acceptInvite({
						userId: users.ownerA.id,
						code: revoked,
						displayName: "x",
					}),
				).toEqual({
					ok: false,
					reason: "revoked",
				});
				const expired = await inviteB(
					"スタッフ",
					null,
					1,
					new Date("2020-01-01T00:00:00Z"),
				);
				expect(
					await org.acceptInvite({
						userId: users.ownerA.id,
						code: expired,
						displayName: "x",
					}),
				).toEqual({
					ok: false,
					reason: "expired",
				});
				const open = await inviteB("スタッフ", null);
				expect(
					await org.acceptInvite({
						userId: users.ownerB.id,
						code: open,
						displayName: "x",
					}),
				).toEqual({
					ok: false,
					reason: "already_member",
				});
				expect(
					await org.acceptInvite({
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
				const code = await inviteB("スタッフ", 1);
				const racers = await Promise.all([
					createUser("racer-1"),
					createUser("racer-2"),
					createUser("racer-3"),
				]);
				const results = await Promise.all(
					racers.map((user) =>
						org
							.acceptInvite({ userId: user.id, code, displayName: "racer" })
							.catch(() => ({
								ok: false as const,
								reason: "error",
							})),
					),
				);
				expect(results.filter((r) => r.ok)).toHaveLength(1);
				expect(
					(await prisma.invite.findUniqueOrThrow({ where: { code } })).uses,
				).toBe(1);
			});
		});
	},
);
