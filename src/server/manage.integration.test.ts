// テナント・イベント・持ち場・スタッフ・テナントとイベントでのロールの割り当てを、実際の DB で確かめる。
// DATABASE_URL がない環境では飛ばす
import { afterAll, beforeAll, describe, expect, it } from "vite-plus/test";
import { loadEnvFileIfExists } from "../lib/load-env";

loadEnvFileIfExists();
const hasDatabase = Boolean(process.env.DATABASE_URL);

describe.skipIf(!hasDatabase)("管理の操作（DB）", async () => {
	const { prisma } = await import("../lib/prisma.server");
	const { findMembership } = await import("./org-access.server");
	const org = await import("./org.server");
	const manage = await import("./manage.server");

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
	const orgs = {} as Record<"a" | "b", { id: string; slug: string }>;
	const tenantA = { id: "", slug: "main" };
	let ownerA: { id: string };
	let leaderA: { id: string };

	const actorOf = async (userId: string, slug = orgs.a.slug) => {
		const m = await findMembership(userId, slug);
		if (!m) throw new Error("not member");
		return {
			memberId: m.member.id,
			isOwner: m.member.isOwner,
			permissions: m.member.permissions,
		};
	};

	beforeAll(async () => {
		ownerA = await createUser("m-owner-a");
		const ownerB = await createUser("m-owner-b");
		leaderA = await createUser("m-leader-a");
		for (const [key, owner] of [
			["a", ownerA],
			["b", ownerB],
		] as const) {
			const result = await org.createOrganization({
				userId: owner.id,
				name: key,
				slug: `m-${key}-${suffix}`,
				displayName: key,
			});
			if (!result.ok) throw new Error(result.errors.join());
			orgs[key] = await prisma.organization.findUniqueOrThrow({
				where: { slug: result.slug },
			});
		}
		tenantA.id = (
			await prisma.tenant.findFirstOrThrow({
				where: { organizationId: orgs.a.id },
			})
		).id;
		const leaderRole = await prisma.orgRole.findFirstOrThrow({
			where: { organizationId: orgs.a.id, name: "リーダー" },
		});
		await prisma.member.create({
			data: {
				organizationId: orgs.a.id,
				userId: leaderA.id,
				displayName: "leader",
				roles: { create: { roleId: leaderRole.id } },
			},
		});
	});

	afterAll(async () => {
		await prisma.organization.deleteMany({
			where: {
				id: { in: [orgs.a?.id, orgs.b?.id].filter(Boolean) as string[] },
			},
		});
		await prisma.user.deleteMany({ where: { id: { in: userIds } } });
	});

	const tenantInput = (slug: string) => ({
		name: slug,
		slug,
		timeUnitMinutes: 15,
	});
	const eventInput = (slug: string) => ({
		name: slug,
		slug,
		timeUnitMinutes: null,
	});
	const positionInput = {
		name: "受付",
		color: "#123456",
		requiredStaffCount: 2,
		isBreak: false,
	};

	it("テナントの URL 名は団体の中で重ならない（ほかの団体とは同じでよい）", async () => {
		expect(
			await manage.createTenant(orgs.a.id, tenantInput("shop")),
		).toMatchObject({ ok: true });
		expect(
			await manage.createTenant(orgs.a.id, tenantInput("shop")),
		).toMatchObject({ ok: false });
		expect(
			await manage.createTenant(orgs.b.id, tenantInput("shop")),
		).toMatchObject({ ok: true });
	});

	it("ほかの団体のテナントは変えられない", async () => {
		const tenantB = await prisma.tenant.findFirstOrThrow({
			where: { organizationId: orgs.b.id },
		});
		expect(
			await manage.updateTenant(orgs.a.id, tenantB.id, tenantInput("stolen")),
		).toMatchObject({
			ok: false,
		});
		expect(
			(await prisma.tenant.findUniqueOrThrow({ where: { id: tenantB.id } }))
				.slug,
		).not.toBe("stolen");
	});

	it("イベントの URL 名はテナントの中で重ならない。ほかのテナントのイベントは変えられず消せない", async () => {
		const ids = { organizationId: orgs.a.id, tenantId: tenantA.id };
		expect(await manage.createEvent(ids, eventInput("fes"))).toMatchObject({
			ok: true,
		});
		expect(await manage.createEvent(ids, eventInput("fes"))).toMatchObject({
			ok: false,
		});
		const shop = await prisma.tenant.findFirstOrThrow({
			where: { organizationId: orgs.a.id, slug: "shop" },
		});
		const otherIds = { organizationId: orgs.a.id, tenantId: shop.id };
		expect(await manage.createEvent(otherIds, eventInput("fes"))).toMatchObject(
			{ ok: true },
		);
		const fes = await prisma.event.findFirstOrThrow({
			where: { tenantId: tenantA.id, slug: "fes" },
		});
		expect(
			await manage.updateEvent(otherIds, fes.id, eventInput("moved")),
		).toMatchObject({ ok: false });
		expect(await manage.deleteEvent(otherIds, fes.id)).toMatchObject({
			ok: false,
		});
		expect(await prisma.event.count({ where: { id: fes.id } })).toBe(1);
	});

	it("持ち場は単位の中だけ：日常の持ち場をイベントから・ほかのテナントから変えたり消したりできない", async () => {
		const daily = {
			organizationId: orgs.a.id,
			tenantId: tenantA.id,
			eventId: null,
		};
		expect(await manage.createPosition(daily, positionInput)).toMatchObject({
			ok: true,
		});
		const position = await prisma.position.findFirstOrThrow({
			where: { tenantId: tenantA.id, eventId: null },
		});
		const fes = await prisma.event.findFirstOrThrow({
			where: { tenantId: tenantA.id, slug: "fes" },
		});
		const eventScope = { ...daily, eventId: fes.id };
		expect(
			await manage.updatePosition(eventScope, position.id, {
				...positionInput,
				name: "x",
			}),
		).toMatchObject({
			ok: false,
		});
		const shop = await prisma.tenant.findFirstOrThrow({
			where: { organizationId: orgs.a.id, slug: "shop" },
		});
		expect(
			await manage.deletePosition({ ...daily, tenantId: shop.id }, position.id),
		).toMatchObject({ ok: false });
		expect(
			await manage.updatePosition(daily, position.id, {
				...positionInput,
				name: "受付2",
			}),
		).toMatchObject({
			ok: true,
		});
		expect(
			(await prisma.position.findUniqueOrThrow({ where: { id: position.id } }))
				.name,
		).toBe("受付2");
	});

	it("スタッフはほかの団体のメンバーに紐づけられず、同じメンバーを 2 人に紐づけられない", async () => {
		const memberB = await prisma.member.findFirstOrThrow({
			where: { organizationId: orgs.b.id },
		});
		expect(
			await manage.createStaff(orgs.a.id, { name: "x", memberId: memberB.id }),
		).toMatchObject({ ok: false });
		const memberA = await prisma.member.findFirstOrThrow({
			where: { organizationId: orgs.a.id, userId: leaderA.id },
		});
		expect(
			await manage.createStaff(orgs.a.id, {
				name: "リーダー本人",
				memberId: memberA.id,
			}),
		).toMatchObject({
			ok: true,
		});
		expect(
			await manage.createStaff(orgs.a.id, {
				name: "重複",
				memberId: memberA.id,
			}),
		).toMatchObject({ ok: false });
		const staff = await prisma.staff.findFirstOrThrow({
			where: { memberId: memberA.id },
		});
		// ほかの団体のスタッフとしては扱えない
		expect(await manage.deleteStaff(orgs.b.id, staff.id)).toMatchObject({
			ok: false,
		});
	});

	it("テナントでのロールの割り当ても乗っ取り防止が効き、ほかの団体のテナント・ロールは使えない", async () => {
		const leader = await actorOf(leaderA.id);
		const owner = await actorOf(ownerA.id);
		const roles = await prisma.orgRole.findMany({
			where: { organizationId: orgs.a.id },
		});
		const byName = Object.fromEntries(roles.map((r) => [r.name, r.id]));
		const memberA = await prisma.member.findFirstOrThrow({
			where: { organizationId: orgs.a.id, userId: leaderA.id },
		});
		const target = { tenantId: tenantA.id, eventId: null };
		// リーダーは自分にない権限を含むマネージャーを割り当てられない
		expect(
			await manage.setScopedRoles(orgs.a.id, leader, target, memberA.id, [
				byName["マネージャー"],
			]),
		).toMatchObject({ ok: false });
		// オーナーは割り当てられ、外せる
		expect(
			await manage.setScopedRoles(orgs.a.id, owner, target, memberA.id, [
				byName["マネージャー"],
			]),
		).toEqual({ ok: true });
		expect(
			await prisma.tenantMember.count({
				where: { tenantId: tenantA.id, memberId: memberA.id },
			}),
		).toBe(1);
		// リーダーは、自分より強いロール（マネージャー）を外せない
		expect(
			await manage.setScopedRoles(orgs.a.id, leader, target, memberA.id, []),
		).toMatchObject({ ok: false });
		expect(
			await manage.setScopedRoles(orgs.a.id, owner, target, memberA.id, []),
		).toEqual({ ok: true });
		// ほかの団体のテナント・ロールは使えない
		const tenantB = await prisma.tenant.findFirstOrThrow({
			where: { organizationId: orgs.b.id },
		});
		expect(
			await manage.setScopedRoles(
				orgs.a.id,
				owner,
				{ tenantId: tenantB.id, eventId: null },
				memberA.id,
				[],
			),
		).toMatchObject({ ok: false });
		const roleB = await prisma.orgRole.findFirstOrThrow({
			where: { organizationId: orgs.b.id },
		});
		expect(
			await manage.setScopedRoles(orgs.a.id, owner, target, memberA.id, [
				roleB.id,
			]),
		).toMatchObject({
			ok: false,
		});
	});
});
