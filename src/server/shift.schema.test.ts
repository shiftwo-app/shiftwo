import { describe, expect, it } from "vite-plus/test";
import { shiftInputSchema, validateShiftTimeRange } from "./shift.schema";

const at = (time: string) => new Date(`2026-11-20T${time}:00+09:00`);

describe("validateShiftTimeRange", () => {
	it("時間粒度にそろった時間帯なら、エラーはない", () => {
		expect(validateShiftTimeRange(at("09:00"), at("12:30"), 15)).toEqual([]);
	});

	it("終了が開始より前なら、エラーになる", () => {
		expect(validateShiftTimeRange(at("12:00"), at("09:00"), 15)).not.toEqual(
			[],
		);
	});

	it("開始と終了が同じなら、エラーになる", () => {
		expect(validateShiftTimeRange(at("09:00"), at("09:00"), 15)).not.toEqual(
			[],
		);
	});

	it("時間粒度（FR-4-A）にそろっていなければ、エラーになる", () => {
		expect(validateShiftTimeRange(at("09:07"), at("12:00"), 15)).not.toEqual(
			[],
		);
		expect(validateShiftTimeRange(at("09:00"), at("12:07"), 15)).not.toEqual(
			[],
		);
	});
});

describe("validateShiftTimeRange（秒・ミリ秒）", () => {
	it("分がそろっていても秒が混ざっていれば、エラーになる", () => {
		const start = new Date("2026-11-20T09:15:30+09:00");
		expect(validateShiftTimeRange(start, at("12:00"), 15)).toEqual([
			"開始時刻は 15 分単位で指定してください",
		]);
	});

	it("開始と終了の両方がずれていれば、両方のエラーを返す", () => {
		expect(validateShiftTimeRange(at("09:07"), at("12:07"), 15)).toHaveLength(
			2,
		);
	});
});

describe("shiftInputSchema", () => {
	const valid = {
		staffId: "1aa4fead-237e-419c-b102-15eb477468a2",
		roleId: "a0c45d77-cf0d-4a34-91ca-6c9ced8c94e9",
		timeRange: {
			start: "2026-11-20T09:00:00+09:00",
			end: "2026-11-20T12:00:00+09:00",
		},
		isPreferredRole: true,
	};

	it("正しい入力を受け付け、時刻を Date にする", () => {
		const parsed = shiftInputSchema.parse(valid);
		expect(parsed.timeRange.start).toBeInstanceOf(Date);
	});

	it("status を省いたら undefined のまま（更新で今の値を消さないため）", () => {
		expect(shiftInputSchema.parse(valid).status).toBeUndefined();
	});

	it("時刻の形が違えば受け付けない", () => {
		const result = shiftInputSchema.safeParse({
			...valid,
			timeRange: { start: "9:00", end: "12:00" },
		});
		expect(result.success).toBe(false);
	});

	it("知らない status は受け付けない", () => {
		const result = shiftInputSchema.safeParse({ ...valid, status: "done" });
		expect(result.success).toBe(false);
	});
});
