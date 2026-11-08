// シフトの作成・更新・削除。入力を検証してから保存する。
// どの操作も団体（organizationId）の中だけで行い、ほかの団体のスタッフ・役割・シフトには触れない。
// API（server route）と server function の両方から使うので、結果は HTTP に依存しない形で返す
import { z } from "zod";
import { can, type MemberRole } from "../lib/org/permissions";
import { isPrismaError, PRISMA_ERROR } from "../lib/prisma-errors";
import { prisma } from "../lib/prisma.server";
import { type Shift, ShiftStatus } from "../types";
import { shiftInputSchema, validateShiftTimeRange } from "./shift.schema";

/** 書き込みをする人の団体と役割（requireOrgAccess で確かめたもの） */
export type ShiftWriteAccess = { organizationId: string; role: MemberRole };

export type ShiftWriteError = {
	ok: false;
	status: 400 | 403 | 404 | 409;
	message: string;
	/** 画面に出せるエラーメッセージ（時間帯のルール違反など） */
	errors?: string[];
	issues?: unknown;
};

export type ShiftWriteResult = { ok: true; shift: Shift } | ShiftWriteError;

const fail = (
	status: ShiftWriteError["status"],
	message: string,
	extra: Partial<ShiftWriteError> = {},
): ShiftWriteError => ({ ok: false, status, message, ...extra });

const notFound = () =>
	fail(404, "Shift not found", { errors: ["シフトが見つかりません"] });
const forbiddenConfirm = () =>
	fail(403, "Forbidden", { errors: ["確定したシフトを扱う権限がありません"] });

/** Prisma の「見つからない」を 404 にする。それ以外は投げ直す */
const toWriteError = (error: unknown): ShiftWriteError => {
	if (isPrismaError(error, PRISMA_ERROR.notFound)) return notFound();
	throw error;
};

/**
 * 入力を検証してシフトを保存する。id があれば更新、なければ作成。
 * 想定外の失敗（DB に繋がらないなど）は投げる
 */
export const saveShift = async (
	access: ShiftWriteAccess,
	body: unknown,
	id?: string,
): Promise<ShiftWriteResult> => {
	if (!can(access.role, "shift.edit")) {
		return fail(403, "Forbidden", {
			errors: ["シフトを編集する権限がありません"],
		});
	}
	const parsed = shiftInputSchema.safeParse(body);
	if (!parsed.success) {
		return fail(400, "Invalid shift", {
			issues: z.flattenError(parsed.error),
			errors: ["入力の形が正しくありません"],
		});
	}
	const input = parsed.data;
	const canConfirm = can(access.role, "shift.confirm");
	// 確定にするかは、サーバーが権限で決める
	if (input.status === ShiftStatus.confirmed && !canConfirm)
		return forbiddenConfirm();

	const { organizationId } = access;
	const setting = await prisma.shiftSetting.findUnique({
		where: { organizationId },
	});
	if (!setting) return fail(409, "Shift setting is not configured");

	const ruleErrors = validateShiftTimeRange(
		input.timeRange.start,
		input.timeRange.end,
		setting.timeUnitMinutes,
	);
	if (ruleErrors.length > 0) {
		return fail(400, "Invalid time range", {
			issues: { formErrors: ruleErrors },
			errors: ruleErrors,
		});
	}

	// スタッフと役割が、この団体のものかを確かめる（ほかの団体の ID を混ぜられないように）
	const [staffCount, roleCount] = await Promise.all([
		prisma.staff.count({ where: { id: input.staffId, organizationId } }),
		prisma.role.count({ where: { id: input.roleId, organizationId } }),
	]);
	if (staffCount === 0 || roleCount === 0) {
		return fail(400, "Staff or role does not exist", {
			errors: ["スタッフか役割が見つかりません"],
		});
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
		if (id) {
			const existing = await prisma.shift.findFirst({
				where: { id, organizationId },
				select: { status: true },
			});
			if (!existing) return notFound();
			if (existing.status === ShiftStatus.confirmed && !canConfirm) {
				return forbiddenConfirm();
			}
			const shift = await prisma.shift.update({ where: { id }, data });
			return { ok: true, shift: shift as unknown as Shift };
		}
		const shift = await prisma.shift.create({
			data: { ...data, organizationId },
		});
		return { ok: true, shift: shift as unknown as Shift };
	} catch (error) {
		return toWriteError(error);
	}
};

/** シフトを消す。消したシフトを返す（取り消しで元に戻すため） */
export const removeShift = async (
	access: ShiftWriteAccess,
	id: string,
): Promise<ShiftWriteResult> => {
	if (!can(access.role, "shift.edit")) {
		return fail(403, "Forbidden", {
			errors: ["シフトを編集する権限がありません"],
		});
	}
	const existing = await prisma.shift.findFirst({
		where: { id, organizationId: access.organizationId },
		select: { status: true },
	});
	if (!existing) return notFound();
	if (
		existing.status === ShiftStatus.confirmed &&
		!can(access.role, "shift.confirm")
	) {
		return forbiddenConfirm();
	}
	try {
		const shift = await prisma.shift.delete({ where: { id } });
		return { ok: true, shift: shift as unknown as Shift };
	} catch (error) {
		return toWriteError(error);
	}
};

const toResponse = (result: ShiftWriteResult, okStatus: number) =>
	result.ok
		? Response.json(result.shift, { status: okStatus })
		: Response.json(
				{ message: result.message, issues: result.issues },
				{ status: result.status },
			);

/**
 * API 用：リクエストの body を検証してシフトを保存する。
 * id があれば更新（PUT）、なければ作成（POST）
 */
export const writeShift = async (
	request: Request,
	access: ShiftWriteAccess,
	id?: string,
): Promise<Response> => {
	let body: unknown;
	try {
		body = await request.json();
	} catch {
		return Response.json(
			{ message: "Request body must be JSON" },
			{ status: 400 },
		);
	}
	try {
		return toResponse(await saveShift(access, body, id), id ? 200 : 201);
	} catch (error) {
		console.error(error);
		return Response.json(
			{ message: id ? "Error updating shift" : "Error creating shift" },
			{ status: 500 },
		);
	}
};

/** API 用：シフトを消す（DELETE） */
export const deleteShiftResponse = async (
	access: ShiftWriteAccess,
	id: string,
): Promise<Response> => {
	try {
		const result = await removeShift(access, id);
		return result.ok
			? new Response(null, { status: 204 })
			: toResponse(result, 204);
	} catch (error) {
		console.error(error);
		return Response.json({ message: "Error deleting shift" }, { status: 500 });
	}
};
