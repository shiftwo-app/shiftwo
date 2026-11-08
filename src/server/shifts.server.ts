// サーバーだけで使う DB アクセス。どの関数も団体（とテナント・イベント）の ID を受け取り、その中のデータだけを扱う
import { prisma } from "../lib/prisma.server";
import type { Role, Shift, ShiftStatus, Staff } from "../types";

/** シフトの単位（ID）。eventId が null なら日常シフト */
export type ShiftScopeIds = {
	organizationId: string;
	tenantId: string;
	eventId: string | null;
};

export type ShiftBoard = {
	shifts: Shift[];
	/** この単位の役割（日常シフトならテナントの役割、イベントならイベントの役割） */
	roles: Role[];
	/** スタッフは団体全体で共通 */
	staffs: Staff[];
};

export const findShiftBoard = async (
	scope: ShiftScopeIds,
	status: ShiftStatus,
): Promise<ShiftBoard> => {
	const [shifts, roles, staffs] = await Promise.all([
		prisma.shift.findMany({
			where: {
				organizationId: scope.organizationId,
				tenantId: scope.tenantId,
				eventId: scope.eventId,
				status,
			},
		}),
		prisma.role.findMany({
			where: {
				organizationId: scope.organizationId,
				tenantId: scope.tenantId,
				eventId: scope.eventId,
			},
		}),
		prisma.staff.findMany({ where: { organizationId: scope.organizationId } }),
	]);
	return {
		shifts: shifts as unknown as Shift[], // timeRange の JsonValue を TimeRange として扱う
		roles,
		staffs,
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
		include: { staff: true, role: true },
	});

export const findStaffsWithPreferredRoles = (organizationId: string) =>
	prisma.staff.findMany({
		where: { organizationId },
		include: { preferredRoles: true },
	});
