import { describe, expect, it } from "vite-plus/test";
import { translatorFor } from "./i18n/translate";
import {
	detectTimetableFormat,
	parseSessionTime,
	parseTimetable,
	roomsOf,
} from "./timetable";

const t = translatorFor("ja");
const at = (time: string) => Date.parse(`2026-11-20T${time}:00+09:00`);

describe("parseSessionTime", () => {
	it("オフセットのない時刻は日本時間として読む", () => {
		expect(parseSessionTime("2026-11-20 10:00")).toBe(at("10:00"));
		expect(parseSessionTime("2026-11-20T10:00")).toBe(at("10:00"));
	});
	it("オフセットのある ISO 8601 はそのまま読む", () => {
		expect(parseSessionTime("2026-11-20T01:00:00Z")).toBe(at("10:00"));
		expect(parseSessionTime("2026-11-20T10:00:00+09:00")).toBe(at("10:00"));
	});
	it("日付を渡すと、時刻だけも読む（24:00 も可）", () => {
		expect(parseSessionTime("10:00", "2026-11-20")).toBe(at("10:00"));
		expect(parseSessionTime("24:00", "2026-11-20")).toBe(
			Date.parse("2026-11-21T00:00:00+09:00"),
		);
	});
	it("読めないものは null", () => {
		expect(parseSessionTime("10:00")).toBeNull();
		expect(parseSessionTime("2026-11-20 10:75")).toBeNull();
		expect(parseSessionTime("tomorrow")).toBeNull();
	});
});

describe("parseTimetable（CSV）", () => {
	it("見出しで列を決め、行ごとに読む", () => {
		const result = parseTimetable(
			[
				"タイトル,登壇者,部屋,開始,終了,トラック色,タグ",
				"基調講演,山田太郎,ホールA,2026-11-20 10:00,2026-11-20 10:40,#0E7C7B,keynote;ja",
				"LT,佐藤,ホールB,2026-11-20 11:00,2026-11-20 11:30,,",
			].join("\n"),
			"csv",
			null,
			t,
		);
		expect(result.ok).toBe(true);
		if (!result.ok) return;
		expect(result.rows[0]).toEqual({
			line: 2,
			title: "基調講演",
			speaker: "山田太郎",
			room: "ホールA",
			start: at("10:00"),
			end: at("10:40"),
			trackColor: "#0E7C7B",
			tags: ["keynote", "ja"],
			errors: [],
		});
		expect(result.rows[1]?.trackColor).toBeNull();
		expect(roomsOf(result.rows)).toEqual(["ホールA", "ホールB"]);
	});

	it("英語の見出しと、日付の列＋時刻だけ", () => {
		const result = parseTimetable(
			"title,speaker,room,date,start,end\nKeynote,Yamada,Hall A,2026-11-20,10:00,10:40",
			"csv",
			null,
			t,
		);
		expect(result.ok && result.rows[0]?.start).toBe(at("10:00"));
		expect(result.ok && result.rows[0]?.errors).toEqual([]);
	});

	it("問題のある行に理由を付ける", () => {
		const result = parseTimetable(
			[
				"title,speaker,room,start,end,color",
				",山田,ホールA,2026-11-20 10:00,2026-11-20 09:00,red",
				"昼休み,,ホールA,2026-11-19 12:00,2026-11-19 13:00,",
			].join("\n"),
			"csv",
			{ start: at("09:00"), end: at("18:00") },
			t,
		);
		if (!result.ok) throw new Error("parse failed");
		expect(result.rows[0]?.errors).toEqual([
			"タイトルがありません",
			"終了は開始より後にしてください",
			"トラック色「red」は #RRGGBB の形で書いてください",
		]);
		expect(result.rows[1]?.errors).toEqual([
			"登壇者がありません",
			"イベントの期間の外です",
		]);
	});

	it("要る列がなければ、全体を断る", () => {
		expect(parseTimetable("title,speaker\na,b", "csv", null, t)).toEqual({
			ok: false,
			errors: ["1 行目に「タイトル」「部屋」「開始」「終了」の列が要ります"],
		});
	});

	it("表計算ソフトの式よけ（先頭の '）を外す", () => {
		const result = parseTimetable(
			"title,speaker,room,start,end\n'=1+1,山田,ホールA,2026-11-20 10:00,2026-11-20 11:00",
			"csv",
			null,
			t,
		);
		expect(result.ok && result.rows[0]?.title).toBe("=1+1");
	});
});

describe("parseTimetable（JSON）", () => {
	it("配列と { sessions } の両方を読む。登壇者は配列でもよい", () => {
		const sessions = [
			{
				title: "基調講演",
				speakers: ["山田", "佐藤"],
				room: "ホールA",
				start: "2026-11-20T10:00:00+09:00",
				end: "2026-11-20T10:40:00+09:00",
				tags: ["keynote"],
			},
		];
		for (const input of [sessions, { sessions }]) {
			const result = parseTimetable(JSON.stringify(input), "json", null, t);
			if (!result.ok) throw new Error("parse failed");
			expect(result.rows[0]).toMatchObject({
				line: 1,
				speaker: "山田, 佐藤",
				start: at("10:00"),
				tags: ["keynote"],
				errors: [],
			});
		}
	});

	it("読めない JSON は断る", () => {
		expect(parseTimetable("{", "json", null, t).ok).toBe(false);
		expect(parseTimetable('{"a":1}', "json", null, t).ok).toBe(false);
	});
});

describe("detectTimetableFormat", () => {
	it("拡張子か中身で決める", () => {
		expect(detectTimetableFormat("a.json", "")).toBe("json");
		expect(detectTimetableFormat("a.txt", " [ {}]")).toBe("json");
		expect(detectTimetableFormat("a.csv", "title,room")).toBe("csv");
	});
});
