// 同時編集：版番号（version）による上書きの防止と、変更の知らせを、実際の DB で確かめる。
// DATABASE_URL がない環境では飛ばす
import { afterAll, beforeAll, describe, expect, it, vi } from "vite-plus/test";
import { loadEnvFileIfExists } from "../lib/load-env";
import type { Permission } from "../lib/org/permissions";

loadEnvFileIfExists();
const hasDatabase = Boolean(process.env.DATABASE_URL);

describe.skipIf(!hasDatabase)("同時編集（DB）", async () => {
	const { platform } = await import("#platform");
	const { prisma } = await import("../lib/prisma.server");
	const { shiftBoardChannel } = await import("../lib/shift-board-live");
	const { saveShift, removeShift } = await import("./shift-write.server");
	const org = await import("./org.server");

	const suffix = crypto.randomUUID().slice(0, 8);
	const editor: Permission[] = ["shift.view", "shift.edit", "shift.confirm"];
	let userId = "";
	let access: {
		organizationId: string;
		tenantId: string;
		eventId: null;
		permissions: Permission[];
		timeUnitMinutes: number;
		positionsEnabled: boolean;
	};
	let staffId = "";
	let positionId = "";

	const input = (startHour: number) => ({
		staffId,
		positionId,
		timeRange: {
			start: `2026-11-20T${String(startHour).padStart(2, "0")}:00:00+09:00`,
			end: `2026-11-20T${String(startHour + 2).padStart(2, "0")}:00:00+09:00`,
		},
		isPreferredPosition: true,
	});

	/** 知らせ（publish）を待ってから、届いたものを返す */
	const published = async (spy: { mock: { calls: unknown[][] } }) => {
		await new Promise((resolve) => setTimeout(resolve, 0));
		return spy.mock.calls.map(([channel, message]) => ({
			channel,
			event: JSON.parse(message as string) as unknown,
		}));
	};

	beforeAll(async () => {
		const user = await prisma.user.create({
			data: {
				id: crypto.randomUUID(),
				email: `concurrency-${suffix}@example.com`,
				name: "c",
				emailVerified: true,
			},
		});
		userId = user.id;
		const created = await org.createOrganization({
			userId,
			name: "同時編集の団体",
			slug: `cc-${suffix}`,
			displayName: "c",
		});
		if (!created.ok) throw new Error(created.errors.join());
		const organization = await prisma.organization.findUniqueOrThrow({
			where: { slug: created.slug },
		});
		const tenant = await prisma.tenant.findFirstOrThrow({
			where: { organizationId: organization.id },
		});
		access = {
			organizationId: organization.id,
			tenantId: tenant.id,
			eventId: null,
			permissions: editor,
			timeUnitMinutes: 15,
			positionsEnabled: true,
		};
		staffId = (
			await prisma.staff.create({
				data: {
					organizationId: organization.id,
					name: "s",
					unavailableTimes: [],
				},
			})
		).id;
		positionId = (
			await prisma.position.create({
				data: {
					organizationId: organization.id,
					tenantId: tenant.id,
					eventId: null,
					name: "受付",
					color: "#cccccc",
					requiredStaffCount: 1,
				},
			})
		).id;
	});

	afterAll(async () => {
		await prisma.organization.deleteMany({
			where: { id: access.organizationId },
		});
		await prisma.user.deleteMany({ where: { id: userId } });
	});

	it("作ると version 1。読んだときの version で保存すると 1 増える", async () => {
		const created = await saveShift(access, input(9));
		if (!created.ok) throw new Error(created.message);
		expect(created.shift.version).toBe(1);
		const updated = await saveShift(access, input(10), created.shift.id, 1);
		expect(updated).toMatchObject({ ok: true, shift: { version: 2 } });
	});

	it("2 人が同じ version から直すと、後の保存は 409 で止まり、先の内容が残る", async () => {
		const created = await saveShift(access, input(9));
		if (!created.ok) throw new Error(created.message);
		const id = created.shift.id;
		// A と B が、どちらも version 1 を読んで、同時に保存する
		const [a, b] = await Promise.all([
			saveShift(access, input(10), id, 1),
			saveShift(access, input(13), id, 1),
		]);
		const results = [a, b];
		expect(results.filter((r) => r.ok)).toHaveLength(1);
		expect(results.filter((r) => !r.ok)[0]).toMatchObject({
			status: 409,
			conflict: true,
		});
		const winner = results.find((r) => r.ok);
		const stored = await prisma.shift.findUniqueOrThrow({ where: { id } });
		expect(stored.version).toBe(2);
		expect(stored.timeRange).toEqual(
			winner?.ok ? winner.shift.timeRange : undefined,
		);
	});

	it("読んだあとに変えられたシフトは消さない（409）。今の version なら消せる", async () => {
		const created = await saveShift(access, input(9));
		if (!created.ok) throw new Error(created.message);
		const id = created.shift.id;
		await saveShift(access, input(10), id, 1); // ほかの人が変えた（version 2）
		expect(await removeShift(access, id, 1)).toMatchObject({
			ok: false,
			status: 409,
		});
		expect(await prisma.shift.count({ where: { id } })).toBe(1);
		expect(await removeShift(access, id, 2)).toMatchObject({ ok: true });
		expect(await prisma.shift.count({ where: { id } })).toBe(0);
	});

	it("保存・削除のたびに、その単位のチャンネルへ知らせる（止めた保存では知らせない）", async () => {
		const spy = vi.spyOn(platform.realtime, "publish");
		try {
			const created = await saveShift(access, input(9));
			if (!created.ok) throw new Error(created.message);
			const id = created.shift.id;
			await saveShift(access, input(10), id, 99); // 409
			await removeShift(access, id, 1);
			const channel = shiftBoardChannel(access);
			expect(await published(spy)).toEqual([
				{ channel, event: { type: "shift.changed", shiftId: id, version: 1 } },
				{
					channel,
					event: { type: "shift.changed", shiftId: id, version: null },
				},
			]);
		} finally {
			spy.mockRestore();
		}
	});
});
