// テナント・イベント・持ち場・スタッフ・テナントとイベントでのロールの割り当て（サーバー専用）。
// どの操作も団体（とテナント・イベント）の ID で絞り込み、ほかの単位のものには触れない。
// 「権限を持っているか」の確認は呼ぶ側（manage.functions.ts）で行う
import type {
	EventInput,
	PositionInput,
	StaffInput,
	TenantInput,
} from "../lib/manage-schemas";
import { canGrant, parsePermissions } from "../lib/org/permissions";
import { isPrismaError, PRISMA_ERROR } from "../lib/prisma-errors";
import { prisma } from "../lib/prisma.server";
import type { Actor, Result } from "./org.server";
import type { ShiftScopeIds } from "./shifts.server";

const fail = (...errors: string[]): { ok: false; errors: string[] } => ({
	ok: false,
	errors,
});
const SLUG_TAKEN = "この URL はすでに使われています";

/** 一意の制約（URL 名の重なり）を、画面に出せるエラーにする。ほかは投げ直す */
const slugTaken = (error: unknown) => {
	if (isPrismaError(error, PRISMA_ERROR.uniqueViolation))
		return fail(SLUG_TAKEN);
	throw error;
};

// ---- テナント ----

export const createTenant = async (
	organizationId: string,
	input: TenantInput,
): Promise<Result<{ slug: string }>> => {
	try {
		const tenant = await prisma.tenant.create({
			data: { organizationId, ...input },
			select: { slug: true },
		});
		return { ok: true, slug: tenant.slug };
	} catch (error) {
		return slugTaken(error);
	}
};

export const updateTenant = async (
	organizationId: string,
	tenantId: string,
	input: TenantInput,
): Promise<Result<{ slug: string }>> => {
	try {
		const result = await prisma.tenant.updateMany({
			where: { id: tenantId, organizationId },
			data: input,
		});
		if (result.count === 0) return fail("テナントが見つかりません");
		return { ok: true, slug: input.slug };
	} catch (error) {
		return slugTaken(error);
	}
};

// ---- イベント ----

export const createEvent = async (
	ids: { organizationId: string; tenantId: string },
	input: EventInput,
): Promise<Result<{ slug: string }>> => {
	try {
		const event = await prisma.event.create({
			data: { ...ids, ...input },
			select: { slug: true },
		});
		return { ok: true, slug: event.slug };
	} catch (error) {
		return slugTaken(error);
	}
};

export const updateEvent = async (
	ids: { organizationId: string; tenantId: string },
	eventId: string,
	input: EventInput,
): Promise<Result<{ slug: string }>> => {
	try {
		const result = await prisma.event.updateMany({
			where: { id: eventId, ...ids },
			data: input,
		});
		if (result.count === 0) return fail("イベントが見つかりません");
		return { ok: true, slug: input.slug };
	} catch (error) {
		return slugTaken(error);
	}
};

/** イベントを消す（そのイベントの持ち場・シフトも消える） */
export const deleteEvent = async (
	ids: { organizationId: string; tenantId: string },
	eventId: string,
): Promise<Result> => {
	const result = await prisma.event.deleteMany({
		where: { id: eventId, ...ids },
	});
	return result.count === 0 ? fail("イベントが見つかりません") : { ok: true };
};

// ---- 持ち場（日常シフトならテナント、イベントならそのイベントのもの） ----

export const createPosition = async (
	scope: ShiftScopeIds,
	input: PositionInput,
): Promise<Result> => {
	await prisma.position.create({ data: { ...scope, ...input } });
	return { ok: true };
};

export const updatePosition = async (
	scope: ShiftScopeIds,
	positionId: string,
	input: PositionInput,
): Promise<Result> => {
	const result = await prisma.position.updateMany({
		where: { id: positionId, ...scope },
		data: input,
	});
	return result.count === 0 ? fail("持ち場が見つかりません") : { ok: true };
};

/** 持ち場を消す（その持ち場のシフトも消える） */
export const deletePosition = async (
	scope: ShiftScopeIds,
	positionId: string,
): Promise<Result> => {
	const result = await prisma.position.deleteMany({
		where: { id: positionId, ...scope },
	});
	return result.count === 0 ? fail("持ち場が見つかりません") : { ok: true };
};

// ---- スタッフ（団体全体） ----

/** 紐づけるメンバーが同じ団体のメンバーかを確かめる */
const memberBelongs = async (organizationId: string, memberId: string | null) =>
	memberId === null ||
	(await prisma.member.count({ where: { id: memberId, organizationId } })) > 0;

const staffMemberTaken = (error: unknown) => {
	if (isPrismaError(error, PRISMA_ERROR.uniqueViolation)) {
		return fail("このメンバーは、すでにほかのスタッフに紐づいています");
	}
	throw error;
};

export const createStaff = async (
	organizationId: string,
	input: StaffInput,
): Promise<Result> => {
	if (!(await memberBelongs(organizationId, input.memberId))) {
		return fail("メンバーが見つかりません");
	}
	try {
		await prisma.staff.create({
			data: {
				organizationId,
				name: input.name,
				memberId: input.memberId,
				unavailableTimes: [],
			},
		});
		return { ok: true };
	} catch (error) {
		return staffMemberTaken(error);
	}
};

export const updateStaff = async (
	organizationId: string,
	staffId: string,
	input: StaffInput,
): Promise<Result> => {
	if (!(await memberBelongs(organizationId, input.memberId))) {
		return fail("メンバーが見つかりません");
	}
	try {
		const result = await prisma.staff.updateMany({
			where: { id: staffId, organizationId },
			data: { name: input.name, memberId: input.memberId },
		});
		return result.count === 0 ? fail("スタッフが見つかりません") : { ok: true };
	} catch (error) {
		return staffMemberTaken(error);
	}
};

/** スタッフを消す（そのスタッフのシフトも消える） */
export const deleteStaff = async (
	organizationId: string,
	staffId: string,
): Promise<Result> => {
	const result = await prisma.staff.deleteMany({
		where: { id: staffId, organizationId },
	});
	return result.count === 0 ? fail("スタッフが見つかりません") : { ok: true };
};

// ---- テナント・イベントでのロールの割り当て ----

/**
 * テナント（eventId なし）またはイベントで、メンバーに割り当てるロールを付け直す。
 * 付ける・外すロールはどれも、自分が持っている権限の範囲のものだけ（乗っ取り防止）。
 * 読む・確かめる・書くを 1 つのトランザクションで行い、外すのは確かめたロールだけ
 */
export const setScopedRoles = async (
	organizationId: string,
	actor: Actor,
	target: { tenantId: string; eventId: string | null },
	memberId: string,
	roleIds: string[],
): Promise<Result> =>
	prisma.$transaction(async (tx) => {
		const member = await tx.member.findFirst({
			where: { id: memberId, organizationId },
			select: { id: true },
		});
		if (!member) return fail("メンバーが見つかりません");
		const tenant = await tx.tenant.findFirst({
			where: { id: target.tenantId, organizationId },
			select: { id: true },
		});
		if (!tenant) return fail("テナントが見つかりません");
		if (target.eventId) {
			const event = await tx.event.findFirst({
				where: { id: target.eventId, tenantId: tenant.id, organizationId },
				select: { id: true },
			});
			if (!event) return fail("イベントが見つかりません");
		}

		const wanted = [...new Set(roleIds)];
		const found = await tx.orgRole.count({
			where: { organizationId, id: { in: wanted } },
		});
		if (found !== wanted.length) return fail("ロールが見つかりません");

		const current = target.eventId
			? (
					await tx.eventMember.findMany({
						where: { eventId: target.eventId, memberId: member.id },
						select: { roleId: true },
					})
				).map((r) => r.roleId)
			: (
					await tx.tenantMember.findMany({
						where: { tenantId: tenant.id, memberId: member.id },
						select: { roleId: true },
					})
				).map((r) => r.roleId);
		const toAdd = wanted.filter((id) => !current.includes(id));
		const toRemove = current.filter((id) => !wanted.includes(id));
		const changed = await tx.orgRole.findMany({
			where: { organizationId, id: { in: [...toAdd, ...toRemove] } },
			select: { permissions: true },
		});
		if (
			changed.some(
				(r) => !canGrant(actor.permissions, parsePermissions(r.permissions)),
			)
		) {
			return fail(
				"自分が持っていない権限を含むロールは、付けたり外したりできません",
			);
		}

		if (target.eventId) {
			const eventId = target.eventId;
			await tx.eventMember.deleteMany({
				where: { eventId, memberId: member.id, roleId: { in: toRemove } },
			});
			for (const roleId of toAdd) {
				await tx.eventMember.upsert({
					where: {
						eventId_memberId_roleId: { eventId, memberId: member.id, roleId },
					},
					update: {},
					create: { eventId, memberId: member.id, roleId },
				});
			}
		} else {
			await tx.tenantMember.deleteMany({
				where: {
					tenantId: tenant.id,
					memberId: member.id,
					roleId: { in: toRemove },
				},
			});
			for (const roleId of toAdd) {
				await tx.tenantMember.upsert({
					where: {
						tenantId_memberId_roleId: {
							tenantId: tenant.id,
							memberId: member.id,
							roleId,
						},
					},
					update: {},
					create: { tenantId: tenant.id, memberId: member.id, roleId },
				});
			}
		}
		return { ok: true } as const;
	});
