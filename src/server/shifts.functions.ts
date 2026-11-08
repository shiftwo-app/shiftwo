import { createServerFn } from "@tanstack/react-start";
import { type Shift, ShiftStatus } from "../types";
import {
	removeShift,
	saveShift,
	type ShiftWriteResult,
} from "./shift-write.server";
import { findShiftBoard } from "./shifts.server";

// 画面から呼ぶ。中身はサーバーで動き、クライアントには RPC の呼び出しだけが入る

export const getShiftBoard = createServerFn({ method: "GET" })
	.validator((status: unknown): ShiftStatus => {
		if (status === ShiftStatus.draft || status === ShiftStatus.confirmed)
			return status;
		throw new Error(`Invalid shift status: ${String(status)}`);
	})
	.handler(({ data: status }) => findShiftBoard(status));

const requireId = (value: unknown): string => {
	if (typeof value !== "string" || value === "") {
		throw new Error("Shift id is required");
	}
	return value;
};

/** 画面に返す結果。issues（zod の詳細）は返さず、画面に出せる errors だけにする */
export type ShiftMutationResult =
	| { ok: true; shift: Shift }
	| { ok: false; message: string; errors: string[] };

const toMutationResult = (result: ShiftWriteResult): ShiftMutationResult =>
	result.ok
		? result
		: {
				ok: false,
				message: result.message,
				errors: result.errors ?? [result.message],
			};

/** シフトを作る。入力の検証は saveShift が行う */
export const createShift = createServerFn({ method: "POST" })
	.validator((input: unknown) => input)
	.handler(async ({ data }) => toMutationResult(await saveShift(data)));

/** シフトを更新する */
export const updateShift = createServerFn({ method: "POST" })
	.validator((data: { id: unknown; input: unknown }) => ({
		id: requireId(data.id),
		input: data.input,
	}))
	.handler(async ({ data }) =>
		toMutationResult(await saveShift(data.input, data.id)),
	);

/** シフトを消す */
export const deleteShift = createServerFn({ method: "POST" })
	.validator((id: unknown) => requireId(id))
	.handler(async ({ data: id }) => toMutationResult(await removeShift(id)));
