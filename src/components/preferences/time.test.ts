import { describe, expect, it } from "vite-plus/test";
import { formatRange, joinJst, splitJst, timeOptions } from "./time";

describe("希望の休憩の入力の変換", () => {
	it("日本時間の日付と分に分けて、元に戻せる。24:00 は次の日の 0 時", () => {
		const ms = Date.parse("2026-11-20T12:30:00+09:00");
		expect(splitJst(ms)).toEqual({ date: "2026-11-20", minutes: 750 });
		expect(joinJst("2026-11-20", 750)).toBe(ms);
		expect(joinJst("2026-11-20", 1440)).toBe(
			Date.parse("2026-11-21T00:00:00+09:00"),
		);
	});

	it("プルダウンは時間粒度ごと。終わり用だけ 24:00 がある", () => {
		expect(timeOptions(30, false).at(-1)?.label).toBe("23:30");
		expect(timeOptions(30, true).at(-1)?.label).toBe("24:00");
		expect(timeOptions(15, false)).toHaveLength(96);
	});

	it("同じ日の範囲は終わりの日付を省く", () => {
		const start = Date.parse("2026-11-20T12:00:00+09:00");
		expect(formatRange({ start, end: start + 3_600_000 })).toBe(
			"11/20 12:00〜13:00",
		);
		expect(
			formatRange({ start, end: Date.parse("2026-11-21T00:00:00+09:00") }),
		).toBe("11/20 12:00〜24:00");
	});
});
