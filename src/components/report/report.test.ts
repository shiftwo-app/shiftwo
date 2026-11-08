import { describe, expect, it } from "vite-plus/test";
import { buildDayReport, fillLevelOf } from "./report";

const day = Date.parse("2026-11-20T00:00:00+09:00");
const at = (time: string) => `2026-11-20T${time}:00+09:00`;
const shift = (
	id: string,
	staffId: string,
	positionId: string | null,
	start: string,
	end: string,
	isPreferredPosition = true,
) => ({
	id,
	staffId,
	positionId,
	timeRange: { start: at(start), end: at(end) },
	isPreferredPosition,
});
const positions = [
	{
		id: "reception",
		name: "受付",
		color: "#f00",
		requiredStaffCount: 2,
		isBreak: false,
	},
	{
		id: "mc",
		name: "司会",
		color: "#0f0",
		requiredStaffCount: 1,
		isBreak: false,
	},
	{
		id: "rest",
		name: "休憩",
		color: "#999",
		requiredStaffCount: 0,
		isBreak: true,
	},
];
const staffs = [
	{ id: "a", name: "A" },
	{ id: "b", name: "B" },
	{ id: "c", name: "C" },
];
const HOUR = 3_600_000;

describe("充足率の色分け", () => {
	it("90% 未満は注意、70% 未満は危険", () => {
		expect(fillLevelOf(0.95)).toBe("ok");
		expect(fillLevelOf(0.9)).toBe("ok");
		expect(fillLevelOf(0.89)).toBe("warn");
		expect(fillLevelOf(0.69)).toBe("danger");
	});
});

describe("buildDayReport", () => {
	const report = buildDayReport({
		day,
		positions,
		staffs,
		breakGapMinutes: 15,
		conflicts: { s4: ["休憩（12:00〜13:00）と重なっています"] },
		shifts: [
			// 受付（2 人要る）：A は 9-13、B は 9-11。C の同じ人の重なりは 1 人と数える
			shift("s1", "a", "reception", "09:00", "13:00"),
			shift("s2", "b", "reception", "09:00", "11:00"),
			// 司会（1 人）：C が 9-13 に 2 枠（重なり）
			shift("s3", "c", "mc", "09:00", "13:00"),
			shift("s4", "c", "mc", "10:00", "11:00", false),
			// A：13:00-13:30 は休憩の持ち場、13:30-14:00 の空き（15 分以上）も休憩
			shift("s5", "a", "rest", "13:00", "13:30"),
			shift("s6", "a", "mc", "14:00", "15:00"),
			// B：11:00-11:10 の空き（15 分未満）は休憩に数えない
			shift("s7", "b", "mc", "11:10", "12:00"),
		],
	});

	it("その日の時間帯は、休憩の持ち場を除いたシフトの、いちばん早い始まり〜遅い終わり", () => {
		expect(report.window).toEqual({
			start: Date.parse(at("09:00")),
			end: Date.parse(at("15:00")),
		});
	});

	it("充足率は、必要な人数までの延べ時間 ÷ 必要な延べ時間（休憩の持ち場は除く）", () => {
		const reception = report.positions.find((p) => p.id === "reception");
		// 9-11 は 2 人、11-13 は 1 人、13-15 は 0 人。必要は 2 人 × 6 時間
		expect(reception?.filledMs).toBe(2 * 2 * HOUR + 1 * 2 * HOUR);
		expect(reception?.neededMs).toBe(2 * 6 * HOUR);
		expect(reception?.level).toBe("danger");
		// 司会：C の 9-13（重なりは 1 人）＋ B の 11:10-12:00 は必要な人数を超える ＋ A の 14-15
		const mc = report.positions.find((p) => p.id === "mc");
		expect(mc?.filledMs).toBe(4 * HOUR + 1 * HOUR);
		expect(report.positions.map((p) => p.id)).toEqual(["reception", "mc"]);
	});

	it("休憩は、休憩の持ち場のシフトと、決めた長さ以上の空きを合計する", () => {
		const a = report.staffs.find((s) => s.id === "a");
		expect(a?.breakMs).toBe(0.5 * HOUR + 0.5 * HOUR);
		expect(a?.workMs).toBe(5 * HOUR);
		const b = report.staffs.find((s) => s.id === "b");
		expect(b?.breakMs).toBe(0);
	});

	it("希望と違う割り当て（手の印・希望と違う理由）を数える", () => {
		const c = report.staffs.find((s) => s.id === "c");
		expect(c?.overriddenCount).toBe(1);
		expect(c?.shifts.find((s) => s.id === "s4")?.reasons).toHaveLength(1);
		expect(c?.workMs).toBe(4 * HOUR);
	});
});

describe("レポートの CSV", async () => {
	const { formatDuration, positionCsv, staffCsv } =
		await import("./report-csv");
	const { parseCsv } = await import("../../lib/csv");
	const shifts = [
		shift("s1", "a", "reception", "09:00", "10:00"),
		shift("s2", "b", "reception", "09:30", "10:00"),
		shift("s3", "b", "mc", "10:00", "10:30"),
	];
	const report = buildDayReport({
		day,
		shifts,
		positions,
		staffs,
		breakGapMinutes: 15,
	});

	it("長さは 時:分", () => {
		expect(formatDuration(90 * 60_000)).toBe("1:30");
		expect(formatDuration(5 * 60_000)).toBe("0:05");
	});

	it("持ち場別は、列が時間の枠で、枠ごとに入っている人を並べる", () => {
		const rows = parseCsv(
			positionCsv({
				report,
				shifts,
				positions,
				staffs,
				timeUnitMinutes: 30,
				labels: { position: "持ち場", separator: "・" },
			}),
		);
		expect(rows[0]).toEqual(["持ち場", "09:00", "09:30", "10:00"]);
		expect(rows[1]).toEqual(["受付", "A", "A・B", ""]);
		expect(rows[2]).toEqual(["司会", "", "", "B"]);
	});

	it("スタッフ別は、合計とシフトの一覧。自分の分だけも書き出せる", () => {
		const labels = {
			staff: "スタッフ",
			work: "働く時間",
			break: "休憩",
			overridden: "希望外",
			shift: (n: number) => `シフト ${n}`,
			noPosition: "",
		};
		const rows = parseCsv(staffCsv({ report, positions, labels }));
		expect(rows[0]).toEqual([
			"スタッフ",
			"働く時間",
			"休憩",
			"希望外",
			"シフト 1",
			"シフト 2",
		]);
		expect(rows.find((row) => row[0] === "B")).toEqual([
			"B",
			"1:00",
			"0:00",
			"0",
			"09:30-10:00 受付",
			"10:00-10:30 司会",
		]);
		const mine = parseCsv(
			staffCsv({ report, positions, labels, onlyStaffId: "a" }),
		);
		expect(mine.map((row) => row[0])).toEqual(["スタッフ", "A"]);
	});
});
