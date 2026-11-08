// シフトの確認とレポート（FR-7）の計算。シフトの画面と同じデータ（getShiftBoard）から、1 日分を計算する
import {
	coverageSegments,
	DAY_MS,
	type Interval,
	toMs,
} from "../timeline/layout";
import {
	parseStaffingRules,
	requirementSegments,
	staffingSegments,
} from "../../lib/staffing";

export type ReportShift = {
	id: string;
	staffId: string;
	positionId: string | null;
	timeRange: { start: Date | string; end: Date | string };
	isPreferredPosition: boolean;
};
export type ReportPosition = {
	id: string;
	name: string;
	color: string;
	requiredStaffCount: number;
	isBreak: boolean;
	/** 時間帯ごとの必要人員（DB の Json のまま。parseStaffingRules で読む） */
	staffingRules?: unknown;
};
export type ReportStaff = { id: string; name: string };

/** 充足率の色分け（FR-7-C）：90% 未満は注意、70% 未満は危険 */
export type FillLevel = "ok" | "warn" | "danger";
export const fillLevelOf = (rate: number): FillLevel =>
	rate < 0.7 ? "danger" : rate < 0.9 ? "warn" : "ok";

export type PositionFill = {
	id: string;
	name: string;
	color: string;
	required: number;
	/** 入っている人の延べ時間（必要な人数を超えた分は数えない。ms） */
	filledMs: number;
	/** 必要な延べ時間（必要な人数 × その日の時間帯。ms） */
	neededMs: number;
	/** 充足率（0〜1） */
	rate: number;
	level: FillLevel;
};

export type StaffReportShift = {
	id: string;
	start: number;
	end: number;
	positionId: string | null;
	isBreak: boolean;
	/** 希望と違う割り当てか（手で付けた「希望外」か、希望の持ち場・休憩と違う） */
	overridden: boolean;
	reasons: string[];
};

export type StaffReport = {
	id: string;
	name: string;
	shifts: StaffReportShift[];
	/** 働く時間（休憩の持ち場を除いたシフトの合計。重なりは 1 回と数える。ms） */
	workMs: number;
	/** 休憩の合計（休憩の持ち場のシフト ＋ シフトのあいだの、決めた長さ以上の空き。ms） */
	breakMs: number;
	overriddenCount: number;
};

export type DayReport = {
	day: number;
	/** その日の時間帯（休憩の持ち場を除いた、いちばん早い始まり〜いちばん遅い終わり）。シフトがなければ null */
	window: Interval | null;
	positions: PositionFill[];
	staffs: StaffReport[];
};

const clip = (range: Interval, window: Interval): Interval | null => {
	const start = Math.max(range.start, window.start);
	const end = Math.min(range.end, window.end);
	return start < end ? { start, end } : null;
};

/** 区間の合計の長さ（重なりは 1 回と数える） */
const unionLength = (intervals: Interval[]): number => {
	const sorted = [...intervals].sort((a, b) => a.start - b.start);
	let total = 0;
	let current: Interval | null = null;
	for (const interval of sorted) {
		if (current && interval.start <= current.end) {
			current.end = Math.max(current.end, interval.end);
		} else {
			if (current) total += current.end - current.start;
			current = { ...interval };
		}
	}
	return current ? total + current.end - current.start : total;
};

/**
 * 1 日分（day は日本時間の 0 時）のレポートを作る。
 * - 充足率：その日の時間帯で、持ち場ごとに「入っている人数（必要な人数まで）× 時間」÷「必要な人数 × 時間」
 *   （必要な人数は時間帯ごとの決まりを当てはめる。同じ人の重なった割り当ては 1 人と数える。休憩の持ち場と、その日に必要な人数が 0 の持ち場は除く）
 * - 休憩：休憩の持ち場のシフト ＋ シフトのあいだの、breakGapMinutes 分以上の空き
 */
export const buildDayReport = (input: {
	day: number;
	shifts: ReportShift[];
	positions: ReportPosition[];
	staffs: ReportStaff[];
	breakGapMinutes: number;
	conflicts?: Record<string, string[]>;
}): DayReport => {
	const dayRange = { start: input.day, end: input.day + DAY_MS };
	const positionById = new Map(input.positions.map((p) => [p.id, p]));
	const isBreakShift = (shift: ReportShift) =>
		shift.positionId
			? (positionById.get(shift.positionId)?.isBreak ?? false)
			: false;
	const onDay = input.shifts.flatMap((shift) => {
		const range = clip(
			{ start: toMs(shift.timeRange.start), end: toMs(shift.timeRange.end) },
			dayRange,
		);
		return range ? [{ shift, ...range }] : [];
	});

	const work = onDay.filter((item) => !isBreakShift(item.shift));
	const window: Interval | null =
		work.length > 0
			? {
					start: Math.min(...work.map((item) => item.start)),
					end: Math.max(...work.map((item) => item.end)),
				}
			: null;

	const positions: PositionFill[] = window
		? input.positions.flatMap((position) => {
				if (position.isBreak) return [];
				const requirement = requirementSegments(
					position.requiredStaffCount,
					parseStaffingRules(position.staffingRules),
					window,
				);
				// その日の時間帯に必要な人がいない持ち場は除く
				if (requirement.every((segment) => segment.required === 0)) return [];
				const segments = staffingSegments(
					coverageSegments(
						work
							.filter((item) => item.shift.positionId === position.id)
							.map((item) => ({
								start: item.start,
								end: item.end,
								key: item.shift.staffId,
							})),
						window,
					),
					requirement,
				);
				const length = (segment: { start: number; end: number }) =>
					segment.end - segment.start;
				const filledMs = segments.reduce(
					(sum, segment) =>
						sum + Math.min(segment.count, segment.required) * length(segment),
					0,
				);
				const neededMs = segments.reduce(
					(sum, segment) => sum + segment.required * length(segment),
					0,
				);
				const rate = neededMs > 0 ? filledMs / neededMs : 1;
				return [
					{
						id: position.id,
						name: position.name,
						color: position.color,
						required: position.requiredStaffCount,
						filledMs,
						neededMs,
						rate,
						level: fillLevelOf(rate),
					},
				];
			})
		: [];

	const gapMs = input.breakGapMinutes * 60_000;
	const staffs: StaffReport[] = input.staffs
		.map((staff) => {
			const mine = onDay
				.filter((item) => item.shift.staffId === staff.id)
				.sort((a, b) => a.start - b.start || a.end - b.end);
			const shifts: StaffReportShift[] = mine.map((item) => {
				const reasons = input.conflicts?.[item.shift.id] ?? [];
				return {
					id: item.shift.id,
					start: item.start,
					end: item.end,
					positionId: item.shift.positionId,
					isBreak: isBreakShift(item.shift),
					overridden: !item.shift.isPreferredPosition || reasons.length > 0,
					reasons,
				};
			});
			const workMs = unionLength(shifts.filter((s) => !s.isBreak));
			// 休憩の持ち場のシフトと、シフト（休憩の持ち場も含む）のあいだの長い空き
			let breakMs = unionLength(shifts.filter((s) => s.isBreak));
			let lastEnd: number | null = null;
			for (const shift of shifts) {
				if (lastEnd !== null && shift.start - lastEnd >= gapMs) {
					breakMs += shift.start - lastEnd;
				}
				lastEnd = lastEnd === null ? shift.end : Math.max(lastEnd, shift.end);
			}
			return {
				id: staff.id,
				name: staff.name,
				shifts,
				workMs,
				breakMs,
				overriddenCount: shifts.filter((s) => s.overridden).length,
			};
		})
		.filter((staff) => staff.shifts.length > 0);

	return { day: input.day, window, positions, staffs };
};
