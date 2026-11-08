import { createServerFn } from "@tanstack/react-start";
import { ShiftStatus } from "../types";
import { findShiftBoard } from "./shifts.server";

// 画面の loader から呼ぶ。中身はサーバーで動き、クライアントには RPC の呼び出しだけが入る
export const getShiftBoard = createServerFn({ method: "GET" })
	.validator((status: unknown): ShiftStatus => {
		if (status === ShiftStatus.draft || status === ShiftStatus.confirmed)
			return status;
		throw new Error(`Invalid shift status: ${String(status)}`);
	})
	.handler(({ data: status }) => findShiftBoard(status));
