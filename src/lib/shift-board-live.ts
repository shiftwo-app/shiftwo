// シフトの画面のリアルタイムの更新。画面とサーバーの両方で使う。
// 知らせるのは「何が変わったか」だけで、中身は送らない（受け取った画面が読み直す。権限の確かめは読み直しのときに行われる）
import type { ShiftScopeParams } from "./shift-scope";

/** シフトの画面に関わる、シフト以外の変更（持ち場・スタッフ・タイムテーブル・設定・希望） */
export const BOARD_CHANGE_REASONS = [
	"positions",
	"staff",
	"timetable",
	"settings",
	"preferences",
] as const;
export type BoardChangeReason = (typeof BOARD_CHANGE_REASONS)[number];

export type ShiftBoardEvent =
	| {
			type: "shift.changed";
			shiftId: string;
			/** 変わったあとの version。消されたときは null */
			version: number | null;
	  }
	| { type: "board.changed"; reason: BoardChangeReason };

/** 変更を配る単位（団体・テナント・イベントの ID）。日常シフトは daily */
export const shiftBoardChannel = (ids: {
	organizationId: string;
	tenantId: string;
	eventId: string | null;
}): string => `${ids.organizationId}:${ids.tenantId}:${ids.eventId ?? "daily"}`;

/** 画面がつなぐ URL（パス） */
export const shiftBoardLivePath = (scope: ShiftScopeParams): string => {
	const base = `/api/o/${encodeURIComponent(scope.orgSlug)}/t/${encodeURIComponent(scope.tenantSlug)}`;
	return scope.eventSlug
		? `${base}/e/${encodeURIComponent(scope.eventSlug)}/live`
		: `${base}/live`;
};

/** 届いたメッセージを読む。知らない形なら null */
export const parseShiftBoardEvent = (data: unknown): ShiftBoardEvent | null => {
	if (typeof data !== "string") return null;
	try {
		const value = JSON.parse(data) as Record<string, unknown>;
		if (value.type === "shift.changed" && typeof value.shiftId === "string") {
			return value as ShiftBoardEvent;
		}
		if (
			value.type === "board.changed" &&
			(BOARD_CHANGE_REASONS as readonly unknown[]).includes(value.reason)
		) {
			return value as ShiftBoardEvent;
		}
		return null;
	} catch {
		return null;
	}
};
