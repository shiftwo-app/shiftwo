// イベントのタイムテーブル（FR-6）の取り込み。CSV と JSON を読み、行ごとに確かめる。
// 画面（確かめの表示）とサーバー（登録の前の確かめ直し）の両方で使う。
//
// CSV：
//   タイトル,登壇者,部屋,開始,終了,トラック色,タグ
//   基調講演,山田太郎,ホールA,2026-11-20 10:00,2026-11-20 10:40,#0E7C7B,keynote;ja
// 開始・終了は「日付 時刻」（日本時間）か ISO 8601。日付の列があれば、開始・終了は時刻だけでもよい。
// 列の見出しは日本語・英語と、画面の言語の見出しを受け付ける。タグは ; で区切る
//
// JSON：セッションの配列か、{ "sessions": [...] }。
//   { "title", "speaker"（または speakers の配列）, "room", "start", "end", "trackColor", "tags" }
import { parseCsv, stripFormulaGuard } from "./csv";
import type { Translate } from "./i18n/translate";

/** 一度に取り込めるセッションの数と、ファイルの大きさ */
export const TIMETABLE_MAX_SESSIONS = 1000;
export const TIMETABLE_MAX_BYTES = 500 * 1024;
const TEXT_MAX = 200;
const TAGS_MAX = 20;

export type TimetableFormat = "csv" | "json";

/** 確かめた 1 セッション分（errors が空なら登録できる） */
export type TimetableRow = {
	/** CSV の行番号（見出しが 1 行目）か、JSON の何番目か（1 から） */
	line: number;
	title: string;
	speaker: string;
	room: string;
	start: number | null;
	end: number | null;
	trackColor: string | null;
	tags: string[];
	errors: string[];
};

export type TimetableParseResult =
	| { ok: true; rows: TimetableRow[] }
	| { ok: false; errors: string[] };

type Column =
	| "title"
	| "speaker"
	| "room"
	| "date"
	| "start"
	| "end"
	| "trackColor"
	| "tags";

const HEADER_ALIASES: Record<Column, string[]> = {
	title: ["title", "session", "タイトル", "セッション", "題名"],
	speaker: ["speaker", "speakers", "登壇者", "スピーカー", "講演者"],
	room: ["room", "hall", "track", "部屋", "ホール", "会場"],
	date: ["date", "日付", "日"],
	start: ["start", "starts", "start time", "開始", "開始時刻", "始まり"],
	end: ["end", "ends", "end time", "終了", "終了時刻", "終わり"],
	trackColor: [
		"track color",
		"track_color",
		"trackcolor",
		"color",
		"トラック色",
		"色",
	],
	tags: ["tags", "tag", "タグ"],
};

const normalize = (value: string) => value.trim().toLowerCase();

const DATE_TIME = /^(\d{4})-(\d{2})-(\d{2})[ T](\d{1,2}):(\d{2})(?::(\d{2}))?$/;
const TIME_ONLY = /^(\d{1,2}):(\d{2})$/;
const DATE_ONLY = /^(\d{4})-(\d{2})-(\d{2})$/;
const HAS_OFFSET = /(Z|[+-]\d{2}:?\d{2})$/i;
const COLOR = /^#[0-9a-f]{6}$/i;

/**
 * 時刻を読む（ms）。オフセットの付いた ISO 8601 はそのまま、付いていなければ日本時間とみなす。
 * date を渡すと「10:00」のような時刻だけも読む（終わりは 24:00 も可）。読めなければ null
 */
export const parseSessionTime = (
	value: string,
	date?: string,
): number | null => {
	const text = value.trim();
	if (text === "") return null;
	if (HAS_OFFSET.test(text) && text.includes("T")) {
		const ms = Date.parse(text);
		return Number.isNaN(ms) ? null : ms;
	}
	const jst = (y: string, mo: string, d: string, h: string, mi: string) => {
		const hour = Number(h);
		const minute = Number(mi);
		if (minute > 59 || hour > 24 || (hour === 24 && minute > 0)) return null;
		const day = Date.parse(`${y}-${mo}-${d}T00:00:00+09:00`);
		return Number.isNaN(day) ? null : day + (hour * 60 + minute) * 60_000;
	};
	const full = DATE_TIME.exec(text);
	if (full) return jst(full[1]!, full[2]!, full[3]!, full[4]!, full[5]!);
	const time = TIME_ONLY.exec(text);
	const day = date ? DATE_ONLY.exec(date.trim()) : null;
	if (time && day) return jst(day[1]!, day[2]!, day[3]!, time[1]!, time[2]!);
	return null;
};

const splitTags = (value: unknown): string[] => {
	const items = Array.isArray(value)
		? value.map((item) => String(item))
		: typeof value === "string"
			? value.split(/[;；]/)
			: [];
	return [...new Set(items.map((item) => item.trim()).filter(Boolean))];
};

/** 1 セッション分を確かめる（時刻の読み取りは呼ぶ側が済ませる） */
const checkRow = (
	row: Omit<TimetableRow, "errors">,
	rawStart: string,
	rawEnd: string,
	period: { start: number; end: number } | null,
	t: Translate,
): TimetableRow => {
	const errors: string[] = [];
	if (!row.title) errors.push(t("timetable.errorTitleMissing"));
	if (!row.speaker) errors.push(t("timetable.errorSpeakerMissing"));
	if (!row.room) errors.push(t("timetable.errorRoomMissing"));
	for (const [label, value] of [
		[t("timetable.columnTitle"), row.title],
		[t("timetable.columnSpeaker"), row.speaker],
		[t("timetable.columnRoom"), row.room],
	] as const) {
		if (value.length > TEXT_MAX) {
			errors.push(
				t("timetable.errorTooLong", { column: label, max: TEXT_MAX }),
			);
		}
	}
	if (row.start === null) {
		errors.push(t("timetable.errorBadTime", { value: rawStart || "—" }));
	}
	if (row.end === null) {
		errors.push(t("timetable.errorBadTime", { value: rawEnd || "—" }));
	}
	if (row.start !== null && row.end !== null) {
		if (row.end <= row.start) errors.push(t("timetable.errorTimeOrder"));
		else if (period && (row.start < period.start || row.end > period.end)) {
			errors.push(t("timetable.errorOutsidePeriod"));
		}
	}
	if (row.trackColor !== null && !COLOR.test(row.trackColor)) {
		errors.push(t("timetable.errorBadColor", { value: row.trackColor }));
	}
	if (row.tags.length > TAGS_MAX) {
		errors.push(t("timetable.errorTooManyTags", { max: TAGS_MAX }));
	}
	return { ...row, errors };
};

const text = (value: unknown) =>
	typeof value === "string"
		? stripFormulaGuard(value.trim())
		: typeof value === "number"
			? String(value)
			: "";

const parseCsvTimetable = (
	input: string,
	period: { start: number; end: number } | null,
	t: Translate,
): TimetableParseResult => {
	const [header, ...records] = parseCsv(input).filter((record) =>
		record.some((cell) => cell.trim() !== ""),
	);
	if (!header) return { ok: false, errors: [t("timetable.errorEmpty")] };
	const localized: Partial<Record<Column, string>> = {
		title: t("timetable.columnTitle"),
		speaker: t("timetable.columnSpeaker"),
		room: t("timetable.columnRoom"),
		start: t("timetable.columnStart"),
		end: t("timetable.columnEnd"),
	};
	const columns: Partial<Record<Column, number>> = {};
	header.forEach((cell, index) => {
		const name = normalize(cell.replace(/^﻿/, ""));
		for (const column of Object.keys(HEADER_ALIASES) as Column[]) {
			if (
				columns[column] === undefined &&
				(HEADER_ALIASES[column].includes(name) ||
					(localized[column] && normalize(localized[column]) === name))
			) {
				columns[column] = index;
			}
		}
	});
	const missing = (["title", "room", "start", "end"] as const).filter(
		(column) => columns[column] === undefined,
	);
	if (missing.length > 0) {
		return { ok: false, errors: [t("timetable.errorMissingColumns")] };
	}
	if (records.length === 0)
		return { ok: false, errors: [t("timetable.errorEmpty")] };
	if (records.length > TIMETABLE_MAX_SESSIONS) {
		return {
			ok: false,
			errors: [t("timetable.errorTooMany", { max: TIMETABLE_MAX_SESSIONS })],
		};
	}
	const cell = (record: string[], column: Column) =>
		columns[column] === undefined ? "" : text(record[columns[column]!] ?? "");
	return {
		ok: true,
		rows: records.map((record, index) => {
			const date = cell(record, "date") || undefined;
			const rawStart = cell(record, "start");
			const rawEnd = cell(record, "end");
			const color = cell(record, "trackColor");
			return checkRow(
				{
					line: index + 2,
					title: cell(record, "title"),
					speaker: cell(record, "speaker"),
					room: cell(record, "room"),
					start: parseSessionTime(rawStart, date),
					end: parseSessionTime(rawEnd, date),
					trackColor: color || null,
					tags: splitTags(cell(record, "tags")),
				},
				rawStart,
				rawEnd,
				period,
				t,
			);
		}),
	};
};

const parseJsonTimetable = (
	input: string,
	period: { start: number; end: number } | null,
	t: Translate,
): TimetableParseResult => {
	let data: unknown;
	try {
		data = JSON.parse(input);
	} catch {
		return { ok: false, errors: [t("timetable.errorBadJson")] };
	}
	const list = Array.isArray(data)
		? data
		: data &&
			  typeof data === "object" &&
			  Array.isArray((data as { sessions?: unknown }).sessions)
			? (data as { sessions: unknown[] }).sessions
			: null;
	if (!list) return { ok: false, errors: [t("timetable.errorBadJson")] };
	if (list.length === 0)
		return { ok: false, errors: [t("timetable.errorEmpty")] };
	if (list.length > TIMETABLE_MAX_SESSIONS) {
		return {
			ok: false,
			errors: [t("timetable.errorTooMany", { max: TIMETABLE_MAX_SESSIONS })],
		};
	}
	return {
		ok: true,
		rows: list.map((item, index) => {
			const value = (item && typeof item === "object" ? item : {}) as Record<
				string,
				unknown
			>;
			const speakers = Array.isArray(value.speakers)
				? value.speakers.map(text).filter(Boolean).join(", ")
				: "";
			const rawStart = text(value.start ?? value.startsAt);
			const rawEnd = text(value.end ?? value.endsAt);
			const date = text(value.date) || undefined;
			const color = text(value.trackColor ?? value.track_color ?? value.color);
			return checkRow(
				{
					line: index + 1,
					title: text(value.title),
					speaker: text(value.speaker) || speakers,
					room: text(value.room),
					start: parseSessionTime(rawStart, date),
					end: parseSessionTime(rawEnd, date),
					trackColor: color || null,
					tags: splitTags(value.tags),
				},
				rawStart,
				rawEnd,
				period,
				t,
			);
		}),
	};
};

/** ファイルの名前と中身から、形式を決める（.json か、中身が [ や { で始まれば JSON） */
export const detectTimetableFormat = (
	fileName: string,
	content: string,
): TimetableFormat =>
	/\.json$/i.test(fileName) || /^\s*[[{]/.test(content) ? "json" : "csv";

/**
 * タイムテーブルを読んで、セッションごとに確かめる。
 * period（イベントの期間）を渡すと、その外のセッションを断る
 */
export const parseTimetable = (
	input: string,
	format: TimetableFormat,
	period: { start: number; end: number } | null,
	t: Translate,
): TimetableParseResult => {
	if (new TextEncoder().encode(input).length > TIMETABLE_MAX_BYTES) {
		return { ok: false, errors: [t("timetable.errorTooLarge")] };
	}
	return format === "json"
		? parseJsonTimetable(input, period, t)
		: parseCsvTimetable(input, period, t);
};

/** 部屋の並び：最初に出てくる順（取り込んだ順）を保つ */
export const roomsOf = (sessions: { room: string }[]): string[] => [
	...new Set(sessions.map((session) => session.room)),
];

/** 部屋（ホール）の色。トラック色がないセッションと、部屋の見出しのラベルに使う（FR-6-B） */
export const ROOM_COLORS = [
	// 持ち場の色の見本（ペールトーン）と同じ色。明るい画面・暗い画面のどちらでも沈まない
	"#6FB3AE",
	"#7FA7DE",
	"#A99BE0",
	"#E39AB6",
	"#EE9A8A",
	"#EDB27A",
	"#D9C27A",
	"#93C49A",
] as const;

export const roomColor = (index: number): string =>
	ROOM_COLORS[
		((index % ROOM_COLORS.length) + ROOM_COLORS.length) % ROOM_COLORS.length
	]!;
