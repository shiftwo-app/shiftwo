// 持ち場の必要人員を、時間帯ごとに変える（FR-4-D の拡張）。
// 持ち場の基本の人数（requiredStaffCount）の上に、「この時間帯は何人」という決まりを足す。
// 決まりは時刻（日本時間）で書き、日付がなければ毎日、日付があればその日だけに当てはめる。
// 同じ時間に日付ありと日付なしの決まりが重なったら、日付ありを使う（その日だけの例外として）。
// 画面の不足の帯（ShiftTimeline）と、レポートの充足率（report.ts）の両方で使う
import { z } from "zod";
import type { MessageKey } from "./i18n/messages";

const DAY_MS = 24 * 60 * 60_000;
const JST_OFFSET_MS = 9 * 60 * 60_000;

export type StaffingRule = {
	/** YYYY-MM-DD（日本時間）。null なら毎日 */
	date: string | null;
	/** 始まり（HH:mm） */
	start: string;
	/** 終わり（HH:mm。00:00 と 24:00 は、その日の終わり） */
	end: string;
	count: number;
};

export const STAFFING_RULES_MAX = 50;

const TIME = /^([01]\d|2[0-4]):([0-5]\d)$/;
const DATE = /^\d{4}-\d{2}-\d{2}$/;

/** HH:mm を、その日の 0:00 からの分にする。終わりの 00:00 は 24:00（1440）とみなす */
export const timeToMinutes = (value: string, isEnd = false): number | null => {
	const match = TIME.exec(value);
	if (!match) return null;
	const minutes = Number(match[1]) * 60 + Number(match[2]);
	if (minutes > 24 * 60) return null;
	if (isEnd && minutes === 0) return 24 * 60;
	if (!isEnd && minutes === 24 * 60) return null;
	return minutes;
};

/** 時間帯（分）。読めなければ null */
const rangeOf = (rule: StaffingRule) => {
	const start = timeToMinutes(rule.start);
	const end = timeToMinutes(rule.end, true);
	return start === null || end === null || end <= start ? null : { start, end };
};

export const staffingRuleSchema = z.object({
	date: z.string().regex(DATE, "settings.staffingRuleBadDate").nullable(),
	start: z.string().regex(TIME, "settings.staffingRuleBadTime"),
	end: z.string().regex(TIME, "settings.staffingRuleBadTime"),
	count: z
		.number()
		.int("settings.requiredCountInteger")
		.min(0, "settings.requiredCountMin")
		.max(99, "settings.requiredCountMax"),
});

/** 決まりの一覧の問題（時間の前後、同じ日どうし・毎日どうしの重なり） */
export const staffingRuleIssues = (rules: StaffingRule[]): MessageKey[] => {
	const issues = new Set<MessageKey>();
	const ranges = rules.map(rangeOf);
	ranges.forEach((range, index) => {
		if (!range) issues.add("settings.staffingRuleTimeOrder");
		for (let other = 0; other < index; other++) {
			const a = range;
			const b = ranges[other];
			if (!a || !b || rules[index]!.date !== rules[other]!.date) continue;
			if (a.start < b.end && b.start < a.end) {
				issues.add("settings.staffingRuleOverlap");
			}
		}
	});
	return [...issues];
};

export const staffingRulesSchema = z
	.array(staffingRuleSchema)
	.max(STAFFING_RULES_MAX, "settings.staffingRulesMax")
	.superRefine((rules, ctx) => {
		for (const message of staffingRuleIssues(rules)) {
			ctx.addIssue({ code: "custom", message });
		}
	});

/** DB の Json を読む。形の合わないものは捨てる */
export const parseStaffingRules = (value: unknown): StaffingRule[] => {
	if (!Array.isArray(value)) return [];
	return value.flatMap((item) => {
		const parsed = staffingRuleSchema.safeParse(item);
		return parsed.success && rangeOf(parsed.data) ? [parsed.data] : [];
	});
};

/** 日本時間の日付（YYYY-MM-DD）と、その日の 0:00（ms） */
const jstDay = (ms: number) => {
	const start =
		Math.floor((ms + JST_OFFSET_MS) / DAY_MS) * DAY_MS - JST_OFFSET_MS;
	return {
		start,
		date: new Date(start + JST_OFFSET_MS).toISOString().slice(0, 10),
	};
};

export type RequirementSegment = {
	start: number;
	end: number;
	required: number;
};

/**
 * 期間を「必要な人数が変わらない区間」に分ける。期間を隙間なく覆い、隣り合う区間の人数は必ず違う
 */
export const requirementSegments = (
	base: number,
	rules: StaffingRule[],
	range: { start: number; end: number },
): RequirementSegment[] => {
	if (range.end <= range.start) return [];
	// その時刻に当てはまる人数（日付ありを先に見る）
	const requiredAt = (ms: number): number => {
		const day = jstDay(ms);
		const minute = (ms - day.start) / 60_000;
		const hit = (dated: boolean) =>
			rules.find((rule) => {
				if (dated ? rule.date !== day.date : rule.date !== null) return false;
				const r = rangeOf(rule);
				return r !== null && r.start <= minute && minute < r.end;
			});
		return (hit(true) ?? hit(false))?.count ?? base;
	};
	// 人数が変わりうる時刻：期間の端、日の境目、決まりの始まりと終わり
	const points = new Set([range.start, range.end]);
	for (let day = jstDay(range.start).start; day < range.end; day += DAY_MS) {
		const candidates = [day, day + DAY_MS];
		for (const rule of rules) {
			const r = rangeOf(rule);
			if (!r) continue;
			if (rule.date !== null && rule.date !== jstDay(day).date) continue;
			candidates.push(day + r.start * 60_000, day + r.end * 60_000);
		}
		for (const point of candidates) {
			if (point > range.start && point < range.end) points.add(point);
		}
	}
	const sorted = [...points].sort((a, b) => a - b);
	const segments: RequirementSegment[] = [];
	for (let i = 0; i < sorted.length - 1; i++) {
		const start = sorted[i]!;
		const end = sorted[i + 1]!;
		const required = requiredAt(start);
		const last = segments.at(-1);
		if (last && last.required === required) last.end = end;
		else segments.push({ start, end, required });
	}
	return segments;
};

export type StaffingSegment = {
	start: number;
	end: number;
	count: number;
	required: number;
};

/**
 * 入っている人数の区間と、必要な人数の区間を重ねる（不足の帯とレポートの充足率に使う）。
 * どちらも同じ期間を隙間なく覆っていること
 */
export const staffingSegments = (
	coverage: { start: number; end: number; count: number }[],
	requirement: RequirementSegment[],
): StaffingSegment[] => {
	const points = [
		...new Set(
			[...coverage, ...requirement].flatMap((segment) => [
				segment.start,
				segment.end,
			]),
		),
	].sort((a, b) => a - b);
	const find = <T extends { start: number; end: number }>(
		list: T[],
		ms: number,
	) => list.find((segment) => segment.start <= ms && ms < segment.end);
	const segments: StaffingSegment[] = [];
	for (let i = 0; i < points.length - 1; i++) {
		const start = points[i]!;
		const end = points[i + 1]!;
		const count = find(coverage, start)?.count ?? 0;
		const required = find(requirement, start)?.required ?? 0;
		const last = segments.at(-1);
		if (last && last.count === count && last.required === required) {
			last.end = end;
		} else {
			segments.push({ start, end, count, required });
		}
	}
	return segments;
};
