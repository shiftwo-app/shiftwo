// シフトの作成・更新。入力を検証してから保存し、結果を HTTP の応答にする
import { z } from "zod";
import { Prisma } from "../generated/prisma/client";
import { prisma } from "../lib/prisma.server";
import { shiftInputSchema, validateShiftTimeRange } from "./shift.schema";

const badRequest = (message: string, issues?: unknown) =>
	Response.json({ message, issues }, { status: 400 });

/**
 * リクエストの body を検証してシフトを保存する。
 * id があれば更新（PUT）、なければ作成（POST）
 */
export const writeShift = async (
	request: Request,
	id?: string,
): Promise<Response> => {
	let body: unknown;
	try {
		body = await request.json();
	} catch {
		return badRequest("Request body must be JSON");
	}

	const parsed = shiftInputSchema.safeParse(body);
	if (!parsed.success) {
		return badRequest("Invalid shift", z.flattenError(parsed.error));
	}
	const input = parsed.data;

	const setting = await prisma.shiftSetting.findFirst();
	if (!setting) {
		return Response.json(
			{ message: "Shift setting is not configured" },
			{ status: 409 },
		);
	}
	const ruleErrors = validateShiftTimeRange(
		input.timeRange.start,
		input.timeRange.end,
		setting.timeUnitMinutes,
	);
	if (ruleErrors.length > 0) {
		return badRequest("Invalid time range", { formErrors: ruleErrors });
	}

	const data = {
		staffId: input.staffId,
		roleId: input.roleId,
		timeRange: {
			start: input.timeRange.start.toISOString(),
			end: input.timeRange.end.toISOString(),
		},
		isPreferredRole: input.isPreferredRole,
		status: input.status,
	};

	try {
		const shift = id
			? await prisma.shift.update({ where: { id }, data })
			: await prisma.shift.create({ data });
		return Response.json(shift, { status: id ? 200 : 201 });
	} catch (error) {
		if (error instanceof Prisma.PrismaClientKnownRequestError) {
			// P2025: 更新するシフトがない / P2003: staffId・roleId の参照先がない
			if (error.code === "P2025") {
				return Response.json({ message: "Shift not found" }, { status: 404 });
			}
			if (error.code === "P2003") {
				return badRequest("Staff or role does not exist");
			}
		}
		console.error(error);
		return Response.json(
			{ message: id ? "Error updating shift" : "Error creating shift" },
			{ status: 500 },
		);
	}
};
