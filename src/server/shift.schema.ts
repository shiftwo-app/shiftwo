// シフトの入力の形と、時間帯の業務ルール。クライアントからも読めるよう、サーバー専用の import はしない
import { z } from "zod";
import { ShiftStatus } from "../types";

const isoDateTime = z.iso
	.datetime({ offset: true })
	.transform((value) => new Date(value));

export const shiftInputSchema = z.object({
	staffId: z.uuid(),
	// 持ち場を使わない単位では null（使う単位では必須。saveShift が確かめる）
	positionId: z.uuid().nullable(),
	timeRange: z.object({
		start: isoDateTime,
		end: isoDateTime,
	}),
	isPreferredPosition: z.boolean(),
	// 省いたとき、作成では DB の既定値（draft）、更新では今の値のままにする
	status: z.enum(ShiftStatus).optional(),
});

export type ShiftInput = z.infer<typeof shiftInputSchema>;

/**
 * シフトの時間帯が業務ルールに合っているかを調べ、守れていないルールのメッセージを返す。
 * 何も問題がなければ空の配列を返す。
 *
 * 要件定義（misc/tech-conf-shift-requirement-specーv２.md）より:
 * - FR-4-A: 時間粒度（ShiftSetting.timeUnitMinutes。5 / 10 / 15 / 30 分）は事前に固定する
 * - FR-5-H: イベント時間外はエラーにする（イベントの時間は今の DB にまだ無いので、ここでは扱わない）
 *
 * @param start シフトの開始時刻
 * @param end シフトの終了時刻
 * @param timeUnitMinutes 設定されている時間粒度（分）
 */
export const validateShiftTimeRange = (
	start: Date,
	end: Date,
	timeUnitMinutes: number,
): string[] => {
	const errors: string[] = [];

	// エポックからのミリ秒で割り切れるかを見る。秒・ミリ秒の混入も弾け、サーバーのタイムゾーンに左右されない。
	// UTC 基準でそろえるが、時間粒度（5 / 10 / 15 / 30 分）は 60 を割り切り、日本時間は UTC からちょうど 9 時間なので、
	// 日本時間の「毎時 0 分から」の刻みと同じになる
	const unitMs = timeUnitMinutes * 60_000;

	if (end.getTime() <= start.getTime()) {
		errors.push("終了時刻は開始時刻より後にしてください");
	}
	if (start.getTime() % unitMs !== 0) {
		errors.push(`開始時刻は ${timeUnitMinutes} 分単位で指定してください`);
	}
	if (end.getTime() % unitMs !== 0) {
		errors.push(`終了時刻は ${timeUnitMinutes} 分単位で指定してください`);
	}

	return errors;
};
