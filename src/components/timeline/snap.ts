/**
 * ドラッグ・キーボードでシフトを動かすときの、時間粒度への吸着（FR-1-6・FR-4-A）。
 *
 * 出典：Love-Rox/kichijitsu の apps/web/src/layout/snap.ts（snapStartMs・snapEndMs。MIT License）。
 * kichijitsu は 15 分で固定だったので、時間粒度（ShiftSetting.timeUnitMinutes）を引数で受け取る形にした。
 */
import { MINUTE_MS } from "./layout";

export type DragMode = "move" | "resize-end";

/** 時刻をいちばん近い粒度の目盛りに丸める */
export const snapToUnit = (ms: number, unitMinutes: number): number => {
	const unitMs = unitMinutes * MINUTE_MS;
	return Math.round(ms / unitMs) * unitMs;
};

/**
 * ドラッグの移動量から、新しい開始・終了を決める。
 * - move：長さを保ったまま動かし、開始を目盛りに合わせる
 * - resize-end：終了だけを目盛りに合わせる。最短でも 1 目盛りの長さを残す
 */
export const applyDrag = (
	mode: DragMode,
	original: { start: number; end: number },
	deltaMs: number,
	unitMinutes: number,
): { start: number; end: number } => {
	if (mode === "move") {
		const start = snapToUnit(original.start + deltaMs, unitMinutes);
		return { start, end: start + (original.end - original.start) };
	}
	const end = snapToUnit(original.end + deltaMs, unitMinutes);
	return {
		start: original.start,
		end: Math.max(end, original.start + unitMinutes * MINUTE_MS),
	};
};
