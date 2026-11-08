// サーバーだけで使う DB アクセス。どの関数も団体（とテナント・イベント）の ID を受け取り、その中のデータだけを扱う
import { prisma } from "../lib/prisma.server";
import { resolveAvatarUrl } from "../lib/avatar";
import type { Position, Shift, ShiftStatus, Staff } from "../types";

/** シフトの単位（ID）。eventId が null なら日常シフト */
export type ShiftScopeIds = {
	organizationId: string;
	tenantId: string;
	eventId: string | null;
};

export type ShiftBoard = {
	shifts: Shift[];
	/** この単位の持ち場（日常シフトならテナントの持ち場、イベントならイベントの持ち場） */
	positions: Position[];
	/** スタッフは団体全体で共通。avatarUrl は紐づくメンバーのアイコン */
	staffs: (Staff & { avatarUrl: string | null })[];
};

export const findShiftBoard = async (
	scope: ShiftScopeIds,
	status: ShiftStatus,
): Promise<ShiftBoard> => {
	const [shifts, positions, staffs] = await Promise.all([
		prisma.shift.findMany({
			where: {
				organizationId: scope.organizationId,
				tenantId: scope.tenantId,
				eventId: scope.eventId,
				status,
			},
		}),
		prisma.position.findMany({
			where: {
				organizationId: scope.organizationId,
				tenantId: scope.tenantId,
				eventId: scope.eventId,
			},
		}),
		prisma.staff.findMany({
			where: { organizationId: scope.organizationId },
			include: {
				member: {
					select: { avatarUrl: true, user: { select: { image: true } } },
				},
			},
		}),
	]);
	return {
		shifts: shifts as unknown as Shift[], // timeRange の JsonValue を TimeRange として扱う
		positions,
		staffs: staffs.map(({ member, ...staff }) => ({
			...staff,
			avatarUrl: resolveAvatarUrl(member),
		})),
	};
};

export const findShiftsWithRelations = (
	scope: ShiftScopeIds,
	status: ShiftStatus,
) =>
	prisma.shift.findMany({
		where: {
			organizationId: scope.organizationId,
			tenantId: scope.tenantId,
			eventId: scope.eventId,
			status,
		},
		include: { staff: true, position: true },
	});

export const findStaffsWithPreferredRoles = (organizationId: string) =>
	prisma.staff.findMany({
		where: { organizationId },
		include: { preferredPositions: true },
	});
