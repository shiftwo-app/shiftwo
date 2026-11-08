// 持ち場を使うかの設定（団体を基本に、テナント・イベントで上書き）と、使わない単位でのシフトの保存を、実際の DB で確かめる。
// DATABASE_URL がない環境では飛ばす
import { afterAll, beforeAll, describe, expect, it } from "vite-plus/test";
import { loadEnvFileIfExists } from "../lib/load-env";
import type { Permission } from "../lib/org/permissions";

loadEnvFileIfExists();
const hasDatabase = Boolean(process.env.DATABASE_URL);

describe.skipIf(!hasDatabase)("持ち場を使うか（DB）", async () => {
	const { prisma } = await import("../lib/prisma.server");
	const org = await import("./org.server");
	const { findScopeAccess } = await import("./scope-access.server");
	const { saveShift } = await import("./shift-write.server");

	const suffix = crypto.randomUUID().slice(0, 8);
	let userId = "";
	let orgSlug = "";
	let organizationId = "";
	let tenant: { id: string; slug: string };
	let event: { id: string; slug: string };
	let staffId = "";
	let positionId = "";

	const accessOf = async (eventSlug?: string) => {
		const access = await findScopeAccess(userId, {
			orgSlug,
			tenantSlug: tenant.slug,
			eventSlug,
		});
		if (!access) throw new Error("no access");
		return access;
	};
	const writeAccess = async (eventSlug?: string) => {
		const access = await accessOf(eventSlug);
		return {
			organizationId: access.organization.id,
			tenantId: access.tenant.id,
			eventId: access.event?.id ?? null,
			permissions: access.permissions as Permission[],
			timeUnitMinutes: access.timeUnitMinutes,
			positionsEnabled: access.positionsEnabled,
		};
	};
	const input = (position: string | null) => ({
		staffId,
		positionId: position,
		timeRange: {
			start: "2026-11-20T09:00:00+09:00",
			end: "2026-11-20T10:00:00+09:00",
		},
		isPreferredPosition: true,
	});

	beforeAll(async () => {
		const user = await prisma.user.create({
			data: {
				id: crypto.randomUUID(),
				email: `positions-${suffix}@example.com`,
				name: "p",
				emailVerified: true,
			},
		});
		userId = user.id;
		const created = await org.createOrganization({
			userId,
			name: "持ち場の団体",
			slug: `pt-${suffix}`,
			displayName: "p",
		});
		if (!created.ok) throw new Error(created.errors.join());
		orgSlug = created.slug;
		organizationId = (
			await prisma.organization.findUniqueOrThrow({ where: { slug: orgSlug } })
		).id;
		tenant = await prisma.tenant.findFirstOrThrow({
			where: { organizationId },
			select: { id: true, slug: true },
		});
		event = await prisma.event.create({
			data: { organizationId, tenantId: tenant.id, slug: "conf", name: "conf" },
			select: { id: true, slug: true },
		});
		staffId = (
			await prisma.staff.create({
				data: { organizationId, name: "s", unavailableTimes: [] },
			})
		).id;
		positionId = (
			await prisma.position.create({
				data: {
					organizationId,
					tenantId: tenant.id,
					eventId: null,
					name: "レジ",
					color: "#cccccc",
					requiredStaffCount: 1,
				},
			})
		).id;
	});

	afterAll(async () => {
		await prisma.organization.deleteMany({ where: { id: organizationId } });
		await prisma.user.deleteMany({ where: { id: userId } });
	});

	it("団体の設定を基本にして、テナント・イベントで上書きできる", async () => {
		expect((await accessOf()).positionsEnabled).toBe(true);
		await prisma.organization.update({
			where: { id: organizationId },
			data: { positionsEnabled: false },
		});
		expect((await accessOf()).positionsEnabled).toBe(false);
		expect((await accessOf(event.slug)).positionsEnabled).toBe(false);
		await prisma.event.update({
			where: { id: event.id },
			data: { positionsEnabled: true },
		});
		expect((await accessOf(event.slug)).positionsEnabled).toBe(true);
		await prisma.tenant.update({
			where: { id: tenant.id },
			data: { positionsEnabled: true },
		});
		expect((await accessOf()).positionsEnabled).toBe(true);
		// 戻す
		await prisma.tenant.update({
			where: { id: tenant.id },
			data: { positionsEnabled: false },
		});
	});

	it("使わない単位では、持ち場なしでシフトを作れ、送られてきた持ち場は捨てる", async () => {
		const access = await writeAccess();
		expect(access.positionsEnabled).toBe(false);
		const withoutPosition = await saveShift(access, input(null));
		expect(withoutPosition).toMatchObject({
			ok: true,
			shift: { positionId: null },
		});
		const ignored = await saveShift(access, input(positionId));
		expect(ignored).toMatchObject({ ok: true, shift: { positionId: null } });
	});

	it("使う単位では、持ち場が要る", async () => {
		await prisma.tenant.update({
			where: { id: tenant.id },
			data: { positionsEnabled: true },
		});
		const access = await writeAccess();
		expect(await saveShift(access, input(null))).toMatchObject({
			ok: false,
			status: 400,
		});
		expect(await saveShift(access, input(positionId))).toMatchObject({
			ok: true,
			shift: { positionId },
		});
	});
});
