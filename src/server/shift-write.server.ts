// シフトの作成・更新・削除。入力を検証してから保存する。
// どの操作もシフトの単位（団体・テナント・イベント）の中だけで行い、ほかの単位のスタッフ・持ち場・シフトには触れない。
// 日常シフト（eventId なし）にはテナントの持ち場、イベントのシフトにはそのイベントの持ち場しか使えない。
// API（server route）と server function の両方から使うので、結果は HTTP に依存しない形で返す
import { platform } from "#platform";
import { z } from "zod";
import { hasPermission, type Permission } from "../lib/org/permissions";
import { isPrismaError, PRISMA_ERROR } from "../lib/prisma-errors";
import { prisma } from "../lib/prisma.server";
import {
	type ShiftBoardEvent,
	shiftBoardChannel,
} from "../lib/shift-board-live";
import { type Shift, ShiftStatus } from "../types";
import { shiftInputSchema, validateShiftTimeRange } from "./shift.schema";
import type { ShiftScopeIds } from "./shifts.server";

/** 書き込みをする単位と、その単位での権限・時間粒度（requireScopeAccess で確かめたもの） */
export type ShiftWriteAccess = ShiftScopeIds & {
	permissions: Permission[];
	timeUnitMinutes: number;
};

export type ShiftWriteError = {
	ok: false;
	status: 400 | 403 | 404 | 409;
	message: string;
	/** 画面に出せるエラーメッセージ（時間帯のルール違反など） */
	errors?: string[];
	issues?: unknown;
	/** 読んだあとに、ほかの人が先に変えていた（409） */
	conflict?: boolean;
};

export type ShiftWriteResult = { ok: true; shift: Shift } | ShiftWriteError;

const fail = (
	status: ShiftWriteError["status"],
	message: string,
	extra: Partial<ShiftWriteError> = {},
): ShiftWriteError => ({ ok: false, status, message, ...extra });

const notFound = () =>
	fail(404, "Shift not found", { errors: ["シフトが見つかりません"] });
const forbiddenEdit = () =>
	fail(403, "Forbidden", { errors: ["シフトを編集する権限がありません"] });
const forbiddenConfirm = () =>
	fail(403, "Forbidden", { errors: ["確定したシフトを扱う権限がありません"] });
const conflict = () =>
	fail(409, "Shift was changed by someone else", {
		conflict: true,
		errors: [
			"ほかの人が先にこのシフトを変更しました。最新の内容を表示したので、もう一度操作してください",
		],
	});

/** 同じ単位を見ている人に、シフトが変わったことを知らせる（応答は待たせない） */
const announce = (access: ShiftScopeIds, event: ShiftBoardEvent) =>
	platform.runInBackground("シフトの変更を知らせられませんでした", () =>
		platform.realtime.publish(shiftBoardChannel(access), JSON.stringify(event)),
	);

/** Prisma の「見つからない」を 404 にする。それ以外は投げ直す */
const toWriteError = (error: unknown): ShiftWriteError => {
	if (isPrismaError(error, PRISMA_ERROR.notFound)) return notFound();
	throw error;
};

/** この単位のシフトだけを探す条件 */
const inScope = (access: ShiftScopeIds, id: string) => ({
	id,
	organizationId: access.organizationId,
	tenantId: access.tenantId,
	eventId: access.eventId,
});

/**
 * 入力を検証してシフトを保存する。id があれば更新、なければ作成。
 * 更新で expectedVersion を渡すと、今の version がそれと同じときだけ保存する（違えば 409）。
 * 想定外の失敗（DB に繋がらないなど）は投げる
 */
export const saveShift = async (
	access: ShiftWriteAccess,
	body: unknown,
	id?: string,
	expectedVersion?: number,
): Promise<ShiftWriteResult> => {
	if (!hasPermission(access.permissions, "shift.edit")) return forbiddenEdit();
	const parsed = shiftInputSchema.safeParse(body);
	if (!parsed.success) {
		return fail(400, "Invalid shift", {
			issues: z.flattenError(parsed.error),
			errors: ["入力の形が正しくありません"],
		});
	}
	const input = parsed.data;
	const canConfirm = hasPermission(access.permissions, "shift.confirm");
	// 確定にするかは、サーバーが権限で決める
	if (input.status === ShiftStatus.confirmed && !canConfirm) {
		return forbiddenConfirm();
	}

	const ruleErrors = validateShiftTimeRange(
		input.timeRange.start,
		input.timeRange.end,
		access.timeUnitMinutes,
	);
	if (ruleErrors.length > 0) {
		return fail(400, "Invalid time range", {
			issues: { formErrors: ruleErrors },
			errors: ruleErrors,
		});
	}

	// スタッフは団体のもの、持ち場はこの単位（日常シフトならテナント、イベントならそのイベント）のものかを確かめる
	// （ほかの団体・テナント・イベントの ID を混ぜられないように）
	const { organizationId, tenantId, eventId } = access;
	const [staffCount, positionCount] = await Promise.all([
		prisma.staff.count({ where: { id: input.staffId, organizationId } }),
		prisma.position.count({
			where: { id: input.positionId, organizationId, tenantId, eventId },
		}),
	]);
	if (staffCount === 0 || positionCount === 0) {
		return fail(400, "Staff or position does not exist", {
			errors: ["スタッフか持ち場が見つかりません"],
		});
	}

	const data = {
		staffId: input.staffId,
		positionId: input.positionId,
		timeRange: {
			start: input.timeRange.start.toISOString(),
			end: input.timeRange.end.toISOString(),
		},
		isPreferredPosition: input.isPreferredPosition,
		status: input.status,
	};

	try {
		if (id) {
			const existing = await prisma.shift.findFirst({
				where: inScope(access, id),
				select: { status: true },
			});
			if (!existing) return notFound();
			if (existing.status === ShiftStatus.confirmed && !canConfirm) {
				return forbiddenConfirm();
			}
			// version の確かめと書き込みを 1 つの文で行う（確かめたあとに割り込まれない。D1 でも同じ）
			const { count } = await prisma.shift.updateMany({
				where: {
					...inScope(access, id),
					...(expectedVersion === undefined
						? {}
						: { version: expectedVersion }),
				},
				data: { ...data, version: { increment: 1 } },
			});
			if (count === 0) return conflict();
			const shift = await prisma.shift.findUnique({ where: { id } });
			if (!shift) return notFound();
			announce(access, {
				type: "shift.changed",
				shiftId: id,
				version: shift.version,
			});
			return { ok: true, shift: shift as unknown as Shift };
		}
		const shift = await prisma.shift.create({
			data: { ...data, organizationId, tenantId, eventId },
		});
		announce(access, {
			type: "shift.changed",
			shiftId: shift.id,
			version: shift.version,
		});
		return { ok: true, shift: shift as unknown as Shift };
	} catch (error) {
		return toWriteError(error);
	}
};

/**
 * シフトを消す。消したシフトを返す（取り消しで元に戻すため）。
 * expectedVersion を渡すと、今の version がそれと同じときだけ消す（違えば 409）
 */
export const removeShift = async (
	access: ShiftWriteAccess,
	id: string,
	expectedVersion?: number,
): Promise<ShiftWriteResult> => {
	if (!hasPermission(access.permissions, "shift.edit")) return forbiddenEdit();
	const existing = await prisma.shift.findFirst({ where: inScope(access, id) });
	if (!existing) return notFound();
	if (
		existing.status === ShiftStatus.confirmed &&
		!hasPermission(access.permissions, "shift.confirm")
	) {
		return forbiddenConfirm();
	}
	if (expectedVersion !== undefined && existing.version !== expectedVersion) {
		return conflict();
	}
	// 読んだときの version のままのときだけ消す（読んだあとに変えられていたら、消さない）
	const { count } = await prisma.shift.deleteMany({
		where: { ...inScope(access, id), version: existing.version },
	});
	if (count === 0) return conflict();
	announce(access, { type: "shift.changed", shiftId: id, version: null });
	return { ok: true, shift: existing as unknown as Shift };
};

const toResponse = (result: ShiftWriteResult, okStatus: number) =>
	result.ok
		? Response.json(result.shift, { status: okStatus })
		: Response.json(
				{ message: result.message, issues: result.issues },
				{ status: result.status },
			);

/** API の body の version（あれば、その version のときだけ更新する） */
const versionOf = (body: unknown): number | undefined => {
	const version = (body as { version?: unknown } | null)?.version;
	return typeof version === "number" && Number.isInteger(version)
		? version
		: undefined;
};

/**
 * API 用：リクエストの body を検証してシフトを保存する。
 * body に version を入れると、その version のときだけ更新する（違えば 409）。
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
		return toResponse(
			await saveShift(access, body, id, versionOf(body)),
			id ? 200 : 201,
		);
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
