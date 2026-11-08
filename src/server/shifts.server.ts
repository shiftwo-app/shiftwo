// サーバーだけで使う DB アクセス。server function と server route の handler の中からだけ import する
import { prisma } from "../lib/prisma.server";
import type { Role, Shift, ShiftSetting, ShiftStatus, Staff } from "../types";

export type ShiftBoard = {
	shifts: Shift[];
	roles: Role[];
	staffs: Staff[];
	shiftSetting: ShiftSetting | null;
};

export const findShiftBoard = async (
	status: ShiftStatus,
): Promise<ShiftBoard> => {
	const [shifts, roles, staffs, shiftSetting] = await Promise.all([
		prisma.shift.findMany({ where: { status } }),
		prisma.role.findMany(),
		prisma.staff.findMany(),
		prisma.shiftSetting.findFirst(),
	]);
	return {
		shifts: shifts as unknown as Shift[], // timeRange の JsonValue を TimeRange として扱う
		roles,
		staffs,
		shiftSetting,
	};
};

export const findShiftsWithRelations = (status: ShiftStatus) =>
	prisma.shift.findMany({
		where: { status },
		include: { staff: true, role: true },
	});
