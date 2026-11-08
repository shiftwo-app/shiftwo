import { describe, expect, it } from "vite-plus/test";
import { fromDateTimeInputValue, toDateTimeInputValue } from "./datetime";

describe("datetime-local の変換", () => {
	it("時刻を日本時間の YYYY-MM-DDTHH:mm にする", () => {
		expect(toDateTimeInputValue(Date.parse("2026-11-20T00:30:00Z"))).toBe(
			"2026-11-20T09:30",
		);
	});

	it("日本時間として +09:00 付きの ISO にする", () => {
		expect(fromDateTimeInputValue("2026-11-20T09:30")).toBe(
			"2026-11-20T09:30:00+09:00",
		);
	});

	it("往復しても同じ時刻になる", () => {
		const ms = Date.parse("2026-06-01T13:15:00+09:00");
		const iso = fromDateTimeInputValue(toDateTimeInputValue(ms));
		expect(iso && Date.parse(iso)).toBe(ms);
	});

	it("空や形の違う値は undefined", () => {
		expect(fromDateTimeInputValue("")).toBeUndefined();
		expect(fromDateTimeInputValue("2026-11-20 09:30")).toBeUndefined();
	});
});
