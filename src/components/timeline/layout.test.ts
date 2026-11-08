import { describe, expect, it } from "vite-plus/test";
import {
	type Position,
	type Shift,
	ShiftStatus,
	type Staff,
} from "../../types";
import {
	assignLanes,
	buildRows,
	buildTicks,
	computeDisplayRange,
	coverageSegments,
	formatDay,
	formatTime,
	isHourTick,
	listShiftDays,
	readableTextColor,
	shiftsOnDay,
	stepZoom,
} from "./layout";

const at = (time: string) => new Date(`2026-11-20T${time}:00+09:00`);
const ms = (time: string) => at(time).getTime();

const shift = (
	id: string,
	staffId: string,
	positionId: string,
	start: string,
	end: string,
): Shift => ({
	id,
	organizationId: "org",
	tenantId: "tenant",
	eventId: null,
	staffId,
	positionId,
	timeRange: { start: at(start), end: at(end) },
	isPreferredPosition: true,
	status: ShiftStatus.confirmed,
	version: 1,
});

const positions: Position[] = [
	{
		id: "r1",
		organizationId: "org",
		tenantId: "tenant",
		eventId: null,
		name: "受付",
		color: "#3357FF",
		requiredStaffCount: 2,
	},
	{
		id: "r2",
		organizationId: "org",
		tenantId: "tenant",
		eventId: null,
		name: "司会",
		color: "#33FFF6",
		requiredStaffCount: 1,
	},
];
const staffs = [
	{ id: "s1", name: "山田", unavailableTimes: [] },
	{ id: "s2", name: "佐藤", unavailableTimes: [] },
] as unknown as Staff[];

describe("assignLanes", () => {
	it("重ならなければ、すべて 0 段目", () => {
		expect(
			assignLanes([
				{ start: 0, end: 10 },
				{ start: 20, end: 30 },
			]),
		).toEqual([0, 0]);
	});

	it("終了と次の開始が同じ時刻なら、同じ段に並べる", () => {
		expect(
			assignLanes([
				{ start: 0, end: 10 },
				{ start: 10, end: 20 },
			]),
		).toEqual([0, 0]);
	});

	it("重なれば別の段に置き、空いた段を使い回す", () => {
		expect(
			assignLanes([
				{ start: 0, end: 30 },
				{ start: 10, end: 20 },
				{ start: 15, end: 40 },
				{ start: 20, end: 25 },
			]),
		).toEqual([0, 1, 2, 1]);
	});
});

describe("computeDisplayRange", () => {
	it("最初の開始を切り下げ、最後の終了を切り上げる（時の 0 分）", () => {
		const range = computeDisplayRange([
			shift("a", "s1", "r1", "09:30", "11:00"),
			shift("b", "s2", "r1", "13:00", "17:15"),
		]);
		expect(range).toEqual({ start: ms("09:00"), end: ms("18:00") });
	});

	it("シフトがなければ、その日の 9:00〜22:00（日本時間）", () => {
		expect(computeDisplayRange([], at("23:30"))).toEqual({
			start: ms("09:00"),
			end: ms("22:00"),
		});
	});
});

describe("目盛り", () => {
	it("range.start から刻み、range.end は含まない", () => {
		const ticks = buildTicks({ start: ms("09:00"), end: ms("10:00") }, 15);
		expect(ticks.map(formatTime)).toEqual(["09:00", "09:15", "09:30", "09:45"]);
	});

	it("時の 0 分だけを時の目盛りにする", () => {
		expect(isHourTick(ms("09:00"))).toBe(true);
		expect(isHourTick(ms("09:30"))).toBe(false);
	});

	it("ズームは 1 段ずつ進み、端で止まる", () => {
		expect(stepZoom(15, 1)).toBe(30);
		expect(stepZoom(15, -1)).toBe(10);
		expect(stepZoom(30, 1)).toBe(30);
		expect(stepZoom(5, -1)).toBe(5);
	});
});

describe("buildRows", () => {
	const shifts = [
		shift("a", "s1", "r1", "09:00", "12:00"),
		shift("b", "s2", "r1", "10:00", "11:00"),
		shift("c", "s1", "r2", "13:00", "14:00"),
	];

	it("持ち場別は持ち場ごとに 1 行で、重なるシフトは段を分ける", () => {
		const rows = buildRows("position", shifts, positions, staffs);
		expect(rows.map((row) => row.requiredCount)).toEqual([2, 1]);
		expect(rows.map((row) => row.label)).toEqual(["受付", "司会"]);
		expect(rows[0].laneCount).toBe(2);
		expect(rows[0].items.map((item) => item.staff?.name)).toEqual([
			"山田",
			"佐藤",
		]);
		expect(rows[0].color).toBe("#3357FF");
	});

	it("スタッフ別はスタッフごとに 1 行。シフトのない行も 1 段で残す", () => {
		const rows = buildRows("staff", [shifts[0]], positions, staffs);
		expect(
			rows.map((row) => [row.label, row.items.length, row.laneCount]),
		).toEqual([
			["山田", 1, 1],
			["佐藤", 0, 1],
		]);
	});
});

describe("readableTextColor", () => {
	it("明るい背景には黒、暗い背景には白", () => {
		expect(readableTextColor("#33FFF6")).toBe("#000000");
		expect(readableTextColor("#1E3A8A")).toBe("#ffffff");
	});

	it("色がおかしければ黒", () => {
		expect(readableTextColor(undefined)).toBe("#000000");
		expect(readableTextColor("red")).toBe("#000000");
	});
});

describe("日ごとの表示", () => {
	const day1 = shift("a", "s1", "r1", "09:00", "12:00");
	const overnight: Shift = {
		...shift("b", "s2", "r1", "22:00", "23:00"),
		timeRange: {
			start: at("22:00"),
			end: new Date("2026-11-21T02:00:00+09:00"),
		},
	};

	it("シフトのある日を早い順に返し、日をまたぐシフトは両方の日に数える", () => {
		expect(listShiftDays([overnight, day1]).map(formatDay)).toEqual([
			"11/20(金)",
			"11/21(土)",
		]);
	});

	it("その日にかかっているシフトだけを残す", () => {
		const nextDay = new Date("2026-11-21T00:00:00+09:00").getTime();
		expect(shiftsOnDay([day1, overnight], nextDay).map((s) => s.id)).toEqual([
			"b",
		]);
	});

	it("day を渡すと、表示期間をその日の中に収める", () => {
		const nextDay = new Date("2026-11-21T00:00:00+09:00").getTime();
		expect(computeDisplayRange([overnight], undefined, nextDay)).toEqual({
			start: nextDay,
			end: new Date("2026-11-21T02:00:00+09:00").getTime(),
		});
	});
});

describe("coverageSegments（FR-4-D）", () => {
	const range = { start: ms("09:00"), end: ms("18:00") };
	const segment = (start: string, end: string, count: number) => ({
		start: ms(start),
		end: ms(end),
		count,
	});

	it("人数が変わるところで区切り、0 人の区間も含めて表示期間を隙間なく覆う", () => {
		expect(
			coverageSegments(
				[
					{ start: ms("10:00"), end: ms("14:00"), key: "s1" },
					{ start: ms("13:00"), end: ms("16:00"), key: "s2" },
				],
				range,
			),
		).toEqual([
			segment("09:00", "10:00", 0),
			segment("10:00", "13:00", 1),
			segment("13:00", "14:00", 2),
			segment("14:00", "16:00", 1),
			segment("16:00", "18:00", 0),
		]);
	});

	it("人数が同じまま交代するところは、1 つの区間にまとめる", () => {
		expect(
			coverageSegments(
				[
					{ start: ms("09:00"), end: ms("13:00"), key: "s1" },
					{ start: ms("13:00"), end: ms("18:00"), key: "s2" },
				],
				range,
			),
		).toEqual([segment("09:00", "18:00", 1)]);
	});

	it("同じスタッフの重複した割り当ては 1 人と数える", () => {
		expect(
			coverageSegments(
				[
					{ start: ms("09:00"), end: ms("18:00"), key: "s1" },
					{ start: ms("12:00"), end: ms("13:00"), key: "s1" },
				],
				range,
			),
		).toEqual([segment("09:00", "18:00", 1)]);
	});

	it("表示期間の外にはみ出した部分は数えない", () => {
		expect(
			coverageSegments(
				[{ start: ms("07:00"), end: ms("10:00"), key: "s1" }],
				range,
			),
		).toEqual([segment("09:00", "10:00", 1), segment("10:00", "18:00", 0)]);
	});

	it("シフトがなければ、全体で 0 人の区間が 1 つ", () => {
		expect(coverageSegments([], range)).toEqual([segment("09:00", "18:00", 0)]);
	});
});
