import { describe, expect, it } from "vite-plus/test";
import {
	parseStaffingRules,
	requirementSegments,
	staffingRuleIssues,
	staffingRulesSchema,
	staffingSegments,
	timeToMinutes,
} from "./staffing";

const at = (date: string, time: string) =>
	Date.parse(`${date}T${time}:00+09:00`);

describe("timeToMinutes", () => {
	it("終わりの 00:00 と 24:00 は 1 日の終わり", () => {
		expect(timeToMinutes("09:30")).toBe(570);
		expect(timeToMinutes("00:00", true)).toBe(1440);
		expect(timeToMinutes("24:00", true)).toBe(1440);
		expect(timeToMinutes("24:00")).toBeNull();
		expect(timeToMinutes("9:30")).toBeNull();
	});
});

describe("requirementSegments", () => {
	const range = {
		start: at("2026-11-20", "09:00"),
		end: at("2026-11-20", "18:00"),
	};

	it("決まりがなければ、期間全体が基本の人数", () => {
		expect(requirementSegments(2, [], range)).toEqual([
			{ ...range, required: 2 },
		]);
	});

	it("毎日の決まりを、その時間帯だけ当てはめる", () => {
		expect(
			requirementSegments(
				2,
				[{ date: null, start: "12:00", end: "13:00", count: 4 }],
				range,
			),
		).toEqual([
			{ start: range.start, end: at("2026-11-20", "12:00"), required: 2 },
			{
				start: at("2026-11-20", "12:00"),
				end: at("2026-11-20", "13:00"),
				required: 4,
			},
			{ start: at("2026-11-20", "13:00"), end: range.end, required: 2 },
		]);
	});

	it("日付ありの決まりは、その日だけ。毎日の決まりより先に使う", () => {
		const rules = [
			{ date: null, start: "12:00", end: "14:00", count: 4 },
			{ date: "2026-11-21", start: "12:00", end: "13:00", count: 1 },
		];
		const day2 = {
			start: at("2026-11-21", "11:00"),
			end: at("2026-11-21", "15:00"),
		};
		expect(requirementSegments(2, rules, day2)).toEqual([
			{ start: day2.start, end: at("2026-11-21", "12:00"), required: 2 },
			{
				start: at("2026-11-21", "12:00"),
				end: at("2026-11-21", "13:00"),
				required: 1,
			},
			{
				start: at("2026-11-21", "13:00"),
				end: at("2026-11-21", "14:00"),
				required: 4,
			},
			{ start: at("2026-11-21", "14:00"), end: day2.end, required: 2 },
		]);
		// ほかの日には、日付ありの決まりは当てはまらない
		expect(
			requirementSegments(2, rules, {
				start: at("2026-11-20", "12:00"),
				end: at("2026-11-20", "13:00"),
			}),
		).toEqual([
			{
				start: at("2026-11-20", "12:00"),
				end: at("2026-11-20", "13:00"),
				required: 4,
			},
		]);
	});

	it("日をまたぐ期間でも、毎日の決まりを日ごとに当てはめる", () => {
		const segments = requirementSegments(
			1,
			[{ date: null, start: "22:00", end: "24:00", count: 3 }],
			{ start: at("2026-11-20", "21:00"), end: at("2026-11-21", "23:00") },
		);
		expect(segments.filter((s) => s.required === 3)).toEqual([
			{
				start: at("2026-11-20", "22:00"),
				end: at("2026-11-21", "00:00"),
				required: 3,
			},
			{
				start: at("2026-11-21", "22:00"),
				end: at("2026-11-21", "23:00"),
				required: 3,
			},
		]);
	});
});

describe("staffingSegments", () => {
	it("入っている人数と必要な人数を重ねて、どちらかが変わるところで分ける", () => {
		const start = at("2026-11-20", "10:00");
		const mid = at("2026-11-20", "11:00");
		const end = at("2026-11-20", "12:00");
		const half = at("2026-11-20", "10:30");
		expect(
			staffingSegments(
				[
					{ start, end: half, count: 1 },
					{ start: half, end, count: 2 },
				],
				[
					{ start, end: mid, required: 2 },
					{ start: mid, end, required: 3 },
				],
			),
		).toEqual([
			{ start, end: half, count: 1, required: 2 },
			{ start: half, end: mid, count: 2, required: 2 },
			{ start: mid, end, count: 2, required: 3 },
		]);
	});
});

describe("決まりの確かめ", () => {
	it("時間の前後と、同じ日どうしの重なりを断る（毎日と日付ありは重なってよい）", () => {
		expect(
			staffingRuleIssues([
				{ date: null, start: "13:00", end: "12:00", count: 1 },
			]),
		).toEqual(["settings.staffingRuleTimeOrder"]);
		expect(
			staffingRuleIssues([
				{ date: null, start: "12:00", end: "14:00", count: 1 },
				{ date: null, start: "13:00", end: "15:00", count: 2 },
			]),
		).toEqual(["settings.staffingRuleOverlap"]);
		expect(
			staffingRuleIssues([
				{ date: null, start: "12:00", end: "14:00", count: 1 },
				{ date: "2026-11-20", start: "13:00", end: "15:00", count: 2 },
			]),
		).toEqual([]);
		expect(
			staffingRulesSchema.safeParse([
				{ date: "11/20", start: "12:00", end: "13:00", count: 1 },
			]).success,
		).toBe(false);
	});

	it("DB の値は、読めるものだけを使う", () => {
		expect(
			parseStaffingRules([
				{ date: null, start: "12:00", end: "13:00", count: 2 },
				{ date: null, start: "13:00", end: "12:00", count: 2 },
				"bad",
			]),
		).toEqual([{ date: null, start: "12:00", end: "13:00", count: 2 }]);
		expect(parseStaffingRules(null)).toEqual([]);
	});
});
