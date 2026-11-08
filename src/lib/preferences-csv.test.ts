import { describe, expect, it } from "vite-plus/test";
import { parseBreak, parsePreferenceCsv } from "./preferences-csv";

const ms = (time: string) => Date.parse(`2026-11-20T${time}:00+09:00`);
const context = {
	staffs: [
		{ id: "s1", name: "山田太郎" },
		{ id: "s2", name: "佐藤花子" },
		{ id: "s3", name: "同名" },
		{ id: "s4", name: "同名" },
	],
	positions: [
		{ id: "p1", name: "受付" },
		{ id: "p2", name: "司会" },
	],
	positionsEnabled: true,
	timeUnitMinutes: 15,
	period: { start: ms("09:00"), end: ms("18:00") },
};

describe("parseBreak", () => {
	it("「日付 始まり-終わり」を日本時間で読む。24:00 も読め、変な時刻は読まない", () => {
		expect(parseBreak("2026-11-20 12:00-13:00")).toEqual({
			start: ms("12:00"),
			end: ms("13:00"),
		});
		expect(parseBreak(" 2026-11-20 9:30〜10:00 ")?.start).toBe(ms("09:30"));
		expect(parseBreak("2026-11-20 23:00-24:00")?.end).toBe(
			Date.parse("2026-11-21T00:00:00+09:00"),
		);
		for (const bad of [
			"12:00-13:00",
			"2026-11-20 12:70-13:00",
			"2026-11-20 25:00-26:00",
		]) {
			expect(parseBreak(bad), bad).toBeNull();
		}
	});
});

describe("parsePreferenceCsv", () => {
	it("日本語の見出しで読み、スタッフと持ち場を名前で探して、登録する形にする", () => {
		const result = parsePreferenceCsv(
			"スタッフ,休憩,持ち場,メモ\n山田太郎,2026-11-20 12:00-13:00;2026-11-20 15:00-15:15,受付;司会,午前は授業\n",
			context,
		);
		expect(result.ok).toBe(true);
		if (!result.ok) return;
		expect(result.rows[0]).toMatchObject({
			line: 2,
			staffId: "s1",
			errors: [],
			input: { positionIds: ["p1", "p2"], memo: "午前は授業" },
		});
		expect(result.rows[0].input?.breaks).toHaveLength(2);
	});

	it("英語の見出しも読む（列の順番は問わない）", () => {
		const result = parsePreferenceCsv("memo,staff\nhello,佐藤花子\n", context);
		expect(result.ok && result.rows[0]).toMatchObject({
			staffId: "s2",
			input: { memo: "hello", breaks: [], positionIds: [] },
		});
	});

	it("行ごとに、知らないスタッフ・同じ名前・同じ人の 2 行・読めない休憩・知らない持ち場・期間の外を知らせる", () => {
		const result = parsePreferenceCsv(
			[
				"スタッフ,休憩,持ち場",
				"だれか,,",
				"同名,,",
				"山田太郎,2026-11-20 午後,",
				"山田太郎,,",
				"佐藤花子,2026-11-20 07:00-08:00,レジ",
			].join("\n"),
			context,
		);
		if (!result.ok) throw new Error("not ok");
		const errorsOf = (line: number) =>
			result.rows.find((row) => row.line === line)?.errors.join("\n") ?? "";
		expect(errorsOf(2)).toMatch(/見つかりません/);
		expect(errorsOf(3)).toMatch(/複数/);
		expect(errorsOf(4)).toMatch(/読めません/);
		expect(errorsOf(5)).toMatch(/2 回以上/);
		expect(errorsOf(6)).toMatch(/持ち場「レジ」/);
		expect(errorsOf(6)).toMatch(/期間の中/);
		expect(result.rows.every((row) => row.input === null)).toBe(true);
	});

	it("持ち場を使わない単位では、持ち場の列は使えない。スタッフの列がなければ全体を断る", () => {
		const off = parsePreferenceCsv("staff,positions\n山田太郎,受付\n", {
			...context,
			positionsEnabled: false,
			positions: [],
		});
		expect(off.ok && off.rows[0].errors.join()).toMatch(/持ち場の列は空/);
		expect(parsePreferenceCsv("memo\nx\n", context)).toMatchObject({
			ok: false,
		});
		expect(parsePreferenceCsv("", context)).toMatchObject({ ok: false });
	});
});
