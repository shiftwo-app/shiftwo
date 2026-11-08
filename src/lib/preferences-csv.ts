// 希望の CSV での一括登録（FR-5-J）。画面（確かめの表示）とサーバー（登録の前の確かめ直し）の両方で使う。
//
//   スタッフ,休憩,持ち場,メモ
//   山田太郎,2026-11-20 12:00-13:00;2026-11-20 15:00-15:15,受付;司会,午前は授業
//
// 列の見出しは日本語・英語（staff, breaks, positions, memo）と、画面の言語の見出しを受け付ける。
// 休憩は「日付 始まり-終わり」を ; で区切って並べる（時刻は日本時間。終わりは 24:00 も可）。持ち場は名前を ; で区切る
import { parseCsv, toCsv } from "./csv";
import type { Translate } from "./i18n/translate";
import { translatorFor } from "./i18n/translate";
import {
	PREFERENCE_BREAKS_MAX,
	PREFERENCE_MEMO_MAX,
	type PreferenceInput,
	type TimeRangeMs,
	validatePreference,
} from "./preferences";

const ja = translatorFor("ja");

/** 一度に登録できる行の数と、CSV の大きさ */
export const PREFERENCE_CSV_MAX_ROWS = 500;
export const PREFERENCE_CSV_MAX_BYTES = 200 * 1024;

type Column = "staff" | "breaks" | "positions" | "memo";

const HEADER_ALIASES: Record<Column, string[]> = {
	staff: ["staff", "name", "スタッフ", "スタッフ名", "名前"],
	breaks: ["breaks", "break", "休憩"],
	positions: ["positions", "position", "持ち場"],
	memo: ["memo", "note", "notes", "メモ"],
};

const normalize = (value: string) => value.trim().toLowerCase();

/** 見出しの行から、列の位置を決める（画面の言語の見出しも受け付ける） */
const findColumns = (header: string[], t: Translate) => {
	const columns: Partial<Record<Column, number>> = {};
	const localized: Record<Column, string> = {
		staff: t("preferences.csvColumnStaff"),
		breaks: t("preferences.csvColumnBreaks"),
		positions: t("preferences.csvColumnPositions"),
		memo: t("preferences.csvColumnMemo"),
	};
	header.forEach((cell, index) => {
		const name = normalize(cell);
		for (const column of Object.keys(HEADER_ALIASES) as Column[]) {
			if (
				columns[column] === undefined &&
				(HEADER_ALIASES[column].includes(name) ||
					normalize(localized[column]) === name)
			) {
				columns[column] = index;
			}
		}
	});
	return columns;
};

const BREAK_PATTERN =
	/^(\d{4}-\d{2}-\d{2})\s+(\d{1,2}):(\d{2})\s*[-~〜–]\s*(\d{1,2}):(\d{2})$/;

/** 「2026-11-20 12:00-13:00」を時刻（ms、日本時間）にする。読めなければ null */
export const parseBreak = (value: string): TimeRangeMs | null => {
	const match = BREAK_PATTERN.exec(value.trim());
	if (!match) return null;
	const [, date, sh, sm, eh, em] = match;
	const minutes = (h: string, m: string) => Number(h) * 60 + Number(m);
	const start = minutes(sh, sm);
	const end = minutes(eh, em);
	if (Number(sm) > 59 || Number(em) > 59 || start >= 24 * 60 || end > 24 * 60) {
		return null;
	}
	const day = Date.parse(`${date}T00:00:00+09:00`);
	if (Number.isNaN(day)) return null;
	return { start: day + start * 60_000, end: day + end * 60_000 };
};

const splitList = (value: string | undefined) =>
	(value ?? "")
		.split(/[;；]/)
		.map((item) => item.trim())
		.filter(Boolean);

export type PreferenceCsvRow = {
	/** CSV での行の番号（見出しを 1 行目として数える） */
	line: number;
	staffName: string;
	staffId: string | null;
	breaks: TimeRangeMs[];
	positionNames: string[];
	memo: string;
	/** 登録するときの形（エラーがあれば null） */
	input: PreferenceInput | null;
	errors: string[];
};

export type PreferenceCsvResult =
	| { ok: true; rows: PreferenceCsvRow[] }
	| { ok: false; errors: string[] };

/**
 * CSV を読んで、行ごとに希望の形にする。スタッフは名前（同じ名前が 2 人いれば断る）、持ち場は名前で探す。
 * 持ち場を使わない単位（positions が空で positionsEnabled が false）では、持ち場の列は使えない
 */
export const parsePreferenceCsv = (
	text: string,
	context: {
		staffs: { id: string; name: string }[];
		positions: { id: string; name: string }[];
		positionsEnabled: boolean;
		timeUnitMinutes: number;
		period: TimeRangeMs | null;
	},
	t: Translate = ja,
): PreferenceCsvResult => {
	if (new TextEncoder().encode(text).length > PREFERENCE_CSV_MAX_BYTES) {
		return { ok: false, errors: [t("preferences.csvTooLarge")] };
	}
	const [header, ...body] = parseCsv(text);
	if (!header) return { ok: false, errors: [t("preferences.csvEmpty")] };
	const columns = findColumns(header, t);
	if (columns.staff === undefined) {
		return { ok: false, errors: [t("preferences.csvMissingStaffColumn")] };
	}
	if (body.length === 0)
		return { ok: false, errors: [t("preferences.csvEmpty")] };
	if (body.length > PREFERENCE_CSV_MAX_ROWS) {
		return {
			ok: false,
			errors: [
				t("preferences.csvTooManyRows", { max: PREFERENCE_CSV_MAX_ROWS }),
			],
		};
	}

	const staffsByName = new Map<string, { id: string; name: string }[]>();
	for (const staff of context.staffs) {
		const key = normalize(staff.name);
		staffsByName.set(key, [...(staffsByName.get(key) ?? []), staff]);
	}
	const positionsByName = new Map(
		context.positions.map((position) => [normalize(position.name), position]),
	);
	const seenStaff = new Set<string>();

	const rows = body.map((cells, index): PreferenceCsvRow => {
		const cell = (column: Column) =>
			columns[column] === undefined
				? ""
				: (cells[columns[column]] ?? "").trim();
		const errors: string[] = [];
		const staffName = cell("staff");
		const matches = staffsByName.get(normalize(staffName)) ?? [];
		let staffId: string | null = null;
		if (!staffName) errors.push(t("preferences.csvStaffMissing"));
		else if (matches.length === 0)
			errors.push(t("preferences.csvStaffNotFound", { name: staffName }));
		else if (matches.length > 1)
			errors.push(t("preferences.csvStaffAmbiguous", { name: staffName }));
		else staffId = matches[0].id;
		if (staffId && seenStaff.has(staffId)) {
			errors.push(t("preferences.csvStaffDuplicateRow", { name: staffName }));
		}
		if (staffId) seenStaff.add(staffId);

		const breaks: TimeRangeMs[] = [];
		for (const value of splitList(cell("breaks"))) {
			const range = parseBreak(value);
			if (range) breaks.push(range);
			else errors.push(t("preferences.csvBadBreak", { value }));
		}
		if (breaks.length > PREFERENCE_BREAKS_MAX) {
			errors.push(
				t("preferences.breaksMax", { breaksMax: PREFERENCE_BREAKS_MAX }),
			);
		}

		const positionNames = splitList(cell("positions"));
		const positionIds: string[] = [];
		if (positionNames.length > 0 && !context.positionsEnabled) {
			errors.push(t("preferences.csvPositionsNotUsed"));
		} else {
			for (const name of positionNames) {
				const position = positionsByName.get(normalize(name));
				if (position) positionIds.push(position.id);
				else errors.push(t("preferences.csvPositionNotFound", { name }));
			}
		}

		const memo = cell("memo");
		if (memo.length > PREFERENCE_MEMO_MAX) {
			errors.push(t("preferences.memoMax", { memoMax: PREFERENCE_MEMO_MAX }));
		}
		errors.push(
			...validatePreference(
				{ breaks, positionIds },
				{ timeUnitMinutes: context.timeUnitMinutes, period: context.period },
				t,
			),
		);

		return {
			line: index + 2,
			staffName,
			staffId,
			breaks,
			positionNames,
			memo,
			input:
				errors.length === 0 && staffId
					? {
							breaks: breaks.map((range) => ({
								start: new Date(range.start).toISOString(),
								end: new Date(range.end).toISOString(),
							})),
							positionIds,
							memo,
						}
					: null,
			errors,
		};
	});
	return { ok: true, rows };
};

/** ひな形の CSV（見出しと、書き方の例の 1 行） */
export const preferenceCsvTemplate = (
	t: Translate,
	example: { staffName: string; date: string; positionName?: string },
): string =>
	toCsv([
		[
			t("preferences.csvColumnStaff"),
			t("preferences.csvColumnBreaks"),
			t("preferences.csvColumnPositions"),
			t("preferences.csvColumnMemo"),
		],
		[
			example.staffName,
			`${example.date} 12:00-13:00`,
			example.positionName ?? "",
			"",
		],
	]);
