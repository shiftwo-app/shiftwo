// サーバーだけで使う DB アクセス。どの関数も団体の ID を受け取り、その団体のデータだけを扱う
import { prisma } from "../lib/prisma.server";
import type { Role, Shift, ShiftSetting, ShiftStatus, Staff } from "../types";

export type ShiftBoard = {
	shifts: Shift[];
	roles: Role[];
	staffs: Staff[];
	shiftSetting: ShiftSetting | null;
};

export const findShiftBoard = async (
	organizationId: string,
	status: ShiftStatus,
): Promise<ShiftBoard> => {
	const [shifts, roles, staffs, shiftSetting] = await Promise.all([
		prisma.shift.findMany({ where: { organizationId, status } }),
		prisma.role.findMany({ where: { organizationId } }),
		prisma.staff.findMany({ where: { organizationId } }),
		prisma.shiftSetting.findUnique({ where: { organizationId } }),
	]);
	return {
		shifts: shifts as unknown as Shift[], // timeRange の JsonValue を TimeRange として扱う
		roles,
		staffs,
		shiftSetting,
	};
};

export const findShiftsWithRelations = (
	organizationId: string,
	status: ShiftStatus,
) =>
	prisma.shift.findMany({
		where: { organizationId, status },
		include: { staff: true, role: true },
	});

export const findStaffsWithPreferredRoles = (organizationId: string) =>
	prisma.staff.findMany({
		where: { organizationId },
		include: { preferredRoles: true },
	});
