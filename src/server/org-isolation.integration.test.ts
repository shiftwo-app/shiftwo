// 団体どうしのデータの分離と、招待コードを、実際の DB で確かめる。
// DATABASE_URL がない環境（DB を用意していない CI など）では飛ばす
import { afterAll, beforeAll, describe, expect, it } from "vite-plus/test";
import { loadEnvFileIfExists } from "../lib/load-env";

loadEnvFileIfExists();
const hasDatabase = Boolean(process.env.DATABASE_URL);

describe.skipIf(!hasDatabase)("団体どうしのデータの分離（DB）", async () => {
	const { prisma } = await import("../lib/prisma.server");
	const { findMembership, requireOrgAccess, OrgAccessError } =
		await import("./org-access.server");
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

	let ownerA: { id: string };
	let ownerB: { id: string };
	let staffA: { id: string };
	let orgA: { id: string; slug: string };
	let orgB: { id: string; slug: string };
	const ids = {
		staffA: "",
		roleA: "",
		staffB: "",
		roleB: "",
		shiftA: "",
		shiftB: "",
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

	beforeAll(async () => {
		ownerA = await createUser("owner-a");
		ownerB = await createUser("owner-b");
		staffA = await createUser("staff-a");
		for (const [owner, key] of [
			[ownerA, "a"],
			[ownerB, "b"],
		] as const) {
			const result = await createOrganization({
				userId: owner.id,
				name: `テスト団体 ${key}`,
				slug: `test-${key}-${suffix}`,
				displayName: `オーナー ${key}`,
			});
			if (!result.ok) throw new Error(result.errors.join());
		}
		orgA = await prisma.organization.findUniqueOrThrow({
			where: { slug: `test-a-${suffix}` },
		});
		orgB = await prisma.organization.findUniqueOrThrow({
			where: { slug: `test-b-${suffix}` },
		});
		await prisma.member.create({
			data: {
				organizationId: orgA.id,
				userId: staffA.id,
				role: "staff",
				displayName: "スタッフ",
			},
		});
		for (const [org, key] of [
			[orgA, "A"],
			[orgB, "B"],
		] as const) {
			const staff = await prisma.staff.create({
				data: {
					organizationId: org.id,
					name: `スタッフ${key}`,
					unavailableTimes: [],
				},
			});
			const role = await prisma.role.create({
				data: {
					organizationId: org.id,
					name: `役割${key}`,
					color: "#cccccc",
					requiredStaffCount: 1,
				},
			});
			const shift = await prisma.shift.create({
				data: {
					organizationId: org.id,
					staffId: staff.id,
					roleId: role.id,
					timeRange: {
						start: "2026-11-20T00:00:00.000Z",
						end: "2026-11-20T03:00:00.000Z",
					},
					isPreferredRole: true,
					status: "draft",
				},
			});
			ids[`staff${key}`] = staff.id;
			ids[`role${key}`] = role.id;
			ids[`shift${key}`] = shift.id;
		}
	});

	afterAll(async () => {
		await prisma.organization.deleteMany({
			where: { id: { in: [orgA?.id, orgB?.id].filter(Boolean) } },
		});
		await prisma.user.deleteMany({ where: { id: { in: userIds } } });
	});

	const accessOf = (
		role: "owner" | "leader" | "staff" | "guest",
		org = orgA,
	) => ({
		organizationId: org.id,
		role,
	});

	it("所属していない団体は「存在しない」（404）。所属していれば見られる", async () => {
		expect(await findMembership(ownerA.id, orgB.slug)).toBeNull();
		await expect(
			requireOrgAccess(ownerA.id, orgB.slug, "shift.view"),
		).rejects.toMatchObject({
			status: 404,
		});
		await expect(
			requireOrgAccess(ownerA.id, orgA.slug, "shift.view"),
		).resolves.toMatchObject({
			organization: { id: orgA.id },
			member: { role: "owner" },
		});
	});

	it("権限が足りなければ 403（スタッフは編集できない）", async () => {
		const error = await requireOrgAccess(
			staffA.id,
			orgA.slug,
			"shift.edit",
		).catch((e) => e);
		expect(error).toBeInstanceOf(OrgAccessError);
		expect(error.status).toBe(403);
	});

	it("シフトの一覧には、自分の団体のデータだけが入る", async () => {
		const board = await findShiftBoard(orgA.id, "draft" as never);
		expect(board.shifts.map((s) => s.id)).toEqual([ids.shiftA]);
		expect(board.staffs.map((s) => s.id)).toEqual([ids.staffA]);
		expect(board.roles.map((r) => r.id)).toEqual([ids.roleA]);
		expect(board.shiftSetting?.organizationId).toBe(orgA.id);
	});

	it("ほかの団体のスタッフ・役割を混ぜてシフトを作れない", async () => {
		const result = await saveShift(
			accessOf("owner"),
			shiftInput(ids.staffB, ids.roleA),
		);
		expect(result).toMatchObject({ ok: false, status: 400 });
		const result2 = await saveShift(
			accessOf("owner"),
			shiftInput(ids.staffA, ids.roleB),
		);
		expect(result2).toMatchObject({ ok: false, status: 400 });
	});

	it("ほかの団体のシフトは、変えることも消すこともできない（404）", async () => {
		const updated = await saveShift(
			accessOf("owner"),
			shiftInput(ids.staffA, ids.roleA),
			ids.shiftB,
		);
		expect(updated).toMatchObject({ ok: false, status: 404 });
		expect(await removeShift(accessOf("owner"), ids.shiftB)).toMatchObject({
			ok: false,
			status: 404,
		});
		const stillThere = await prisma.shift.findUnique({
			where: { id: ids.shiftB },
		});
		expect(stillThere?.organizationId).toBe(orgB.id);
	});

	it("スタッフ・ゲストは書き込めない。リーダーは確定にできる", async () => {
		expect(
			await saveShift(accessOf("staff"), shiftInput(ids.staffA, ids.roleA)),
		).toMatchObject({
			ok: false,
			status: 403,
		});
		expect(
			await saveShift(accessOf("guest"), shiftInput(ids.staffA, ids.roleA)),
		).toMatchObject({
			ok: false,
			status: 403,
		});
		const created = await saveShift(
			accessOf("leader"),
			shiftInput(ids.staffA, ids.roleA, "confirmed"),
		);
		expect(created).toMatchObject({
			ok: true,
			shift: { organizationId: orgA.id, status: "confirmed" },
		});
	});

	describe("招待コード", () => {
		it("使うと、決めた役割と表示名で参加する。1 回きりのコードは 2 回目に使えない", async () => {
			const invite = await createInvite({
				organizationId: orgB.id,
				createdById: ownerB.id,
				role: "guest",
				maxUses: 1,
				expiresInDays: 7,
			});
			expect(
				await previewInvite(ownerA.id, invite.code.toLowerCase()),
			).toMatchObject({
				ok: true,
				organizationSlug: orgB.slug,
				role: "guest",
				alreadyMember: false,
			});
			expect(
				await acceptInvite({
					userId: ownerA.id,
					code: invite.code,
					displayName: "ゲストのA",
				}),
			).toEqual({ ok: true, slug: orgB.slug });
			expect(await findMembership(ownerA.id, orgB.slug)).toMatchObject({
				member: { role: "guest", displayName: "ゲストのA" },
			});
			expect(
				await acceptInvite({
					userId: staffA.id,
					code: invite.code,
					displayName: "x",
				}),
			).toEqual({ ok: false, reason: "used_up" });
			await prisma.member.deleteMany({
				where: { organizationId: orgB.id, userId: ownerA.id },
			});
		});

		it("取り消し・期限切れ・すでにメンバー・ないコードを見分ける", async () => {
			const revoked = await createInvite({
				organizationId: orgB.id,
				createdById: ownerB.id,
				role: "staff",
				maxUses: null,
				expiresInDays: 7,
			});
			await prisma.invite.update({
				where: { id: revoked.id },
				data: { revokedAt: new Date() },
			});
			expect(
				await acceptInvite({
					userId: ownerA.id,
					code: revoked.code,
					displayName: "x",
				}),
			).toEqual({
				ok: false,
				reason: "revoked",
			});

			const expired = await createInvite({
				organizationId: orgB.id,
				createdById: ownerB.id,
				role: "staff",
				maxUses: null,
				expiresInDays: 1,
				now: new Date("2020-01-01T00:00:00Z"),
			});
			expect(
				await acceptInvite({
					userId: ownerA.id,
					code: expired.code,
					displayName: "x",
				}),
			).toEqual({
				ok: false,
				reason: "expired",
			});

			const open = await createInvite({
				organizationId: orgB.id,
				createdById: ownerB.id,
				role: "staff",
				maxUses: null,
				expiresInDays: 7,
			});
			expect(
				await acceptInvite({
					userId: ownerB.id,
					code: open.code,
					displayName: "x",
				}),
			).toEqual({
				ok: false,
				reason: "already_member",
			});
			expect(
				await acceptInvite({
					userId: ownerA.id,
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
				organizationId: orgA.id,
				createdById: ownerA.id,
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
					}).catch(() => ({ ok: false as const, reason: "error" })),
				),
			);
			expect(results.filter((r) => r.ok)).toHaveLength(1);
			const after = await prisma.invite.findUniqueOrThrow({
				where: { id: invite.id },
			});
			expect(after.uses).toBe(1);
			expect(
				await prisma.member.count({
					where: {
						organizationId: orgA.id,
						userId: { in: racers.map((u) => u.id) },
					},
				}),
			).toBe(1);
		});
	});
});
