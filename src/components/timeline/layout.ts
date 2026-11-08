// タイムラインの計算（純粋な関数）。描画は ShiftTimeline.tsx が受け持つ
import type { Position, Shift, Staff } from "../../types";

export const MINUTE_MS = 60_000;
const HOUR_MS = 60 * MINUTE_MS;
const DAY_MS = 24 * HOUR_MS;

/** 表示に使うタイムゾーン。SSR とブラウザで表示がずれないよう、閲覧者の環境ではなく固定にする */
export const DISPLAY_TIME_ZONE = "Asia/Tokyo";
const DISPLAY_OFFSET_MS = 9 * HOUR_MS; // Asia/Tokyo は夏時間がなく、常に UTC+9

/** ズームの段階（FR-1-8）。1 目盛りあたりの分。小さいほど拡大 */
export const ZOOM_OPTIONS = [5, 10, 15, 30] as const;
export type ZoomMinutes = (typeof ZOOM_OPTIONS)[number];

/** ズームを 1 段進める。direction は +1 で縮小（目盛りを粗く）、-1 で拡大。端では止まる */
export const stepZoom = (
	current: ZoomMinutes,
	direction: -1 | 1,
): ZoomMinutes => {
	const index = ZOOM_OPTIONS.indexOf(current) + direction;
	return ZOOM_OPTIONS[Math.min(Math.max(index, 0), ZOOM_OPTIONS.length - 1)];
};

export type TimelineAxis = "position" | "staff";

export type Interval = { start: number; end: number };

export type TimelineItem = Interval & {
	shift: Shift;
	position?: Position;
	staff?: Staff;
	/** 行の中で何段目に置くか（0 始まり） */
	lane: number;
};

export type TimelineRow = {
	id: string;
	label: string;
	color?: string;
	items: TimelineItem[];
	/** 行の段数。シフトがなくても 1 */
	laneCount: number;
	/** 持ち場別の行だけ：必要な人数（Position.requiredStaffCount） */
	requiredCount?: number;
};

/** ある時間帯に、何人のシフトが重なっているか */
export type CoverageSegment = Interval & { count: number };

export const toMs = (value: Date | string): number => new Date(value).getTime();

const timeFormatter = new Intl.DateTimeFormat("ja-JP", {
	timeZone: DISPLAY_TIME_ZONE,
	hour: "2-digit",
	minute: "2-digit",
	hourCycle: "h23",
});

const dateFormatter = new Intl.DateTimeFormat("ja-JP", {
	timeZone: DISPLAY_TIME_ZONE,
	month: "numeric",
	day: "numeric",
	weekday: "short",
});

/** 日付の見出し（例：6/1(土)） */
export const formatDay = (ms: number): string => dateFormatter.format(ms);

/** その時刻を含む日の 0:00（表示のタイムゾーン） */
export const startOfDisplayDay = (ms: number): number =>
	Math.floor((ms + DISPLAY_OFFSET_MS) / DAY_MS) * DAY_MS - DISPLAY_OFFSET_MS;

/** シフトのある日（0:00 の時刻）を早い順に。日をまたぐシフトは、かかっている日すべてに数える */
export const listShiftDays = (shifts: Shift[]): number[] => {
	const days = new Set<number>();
	for (const shift of shifts) {
		const end = toMs(shift.timeRange.end);
		for (
			let day = startOfDisplayDay(toMs(shift.timeRange.start));
			day < end;
			day += DAY_MS
		) {
			days.add(day);
		}
	}
	return [...days].sort((a, b) => a - b);
};

/** その日にかかっているシフトだけを残す */
export const shiftsOnDay = (shifts: Shift[], day: number): Shift[] =>
	shifts.filter(
		(shift) =>
			toMs(shift.timeRange.start) < day + DAY_MS &&
			toMs(shift.timeRange.end) > day,
	);

/** 24 時間表記の HH:mm（FR-1-4） */
export const formatTime = (ms: number): string => timeFormatter.format(ms);

/**
 * 表示する期間を決める。シフトがあれば、最初の開始を時の 0 分に切り下げ、最後の終了を切り上げる。
 * day を渡すと、その日の 0:00〜24:00 の中に収める（日をまたぐシフトがあっても、その日の分だけ）。
 * シフトがなければ、day（なければ now）の日の 9:00〜22:00（表示のタイムゾーン）
 */
export const computeDisplayRange = (
	shifts: Shift[],
	now: Date = new Date(),
	day?: number,
): Interval => {
	if (shifts.length === 0) {
		const dayStart = day ?? startOfDisplayDay(now.getTime());
		return { start: dayStart + 9 * HOUR_MS, end: dayStart + 22 * HOUR_MS };
	}
	const starts = shifts.map((shift) => toMs(shift.timeRange.start));
	const ends = shifts.map((shift) => toMs(shift.timeRange.end));
	const start = Math.floor(Math.min(...starts) / HOUR_MS) * HOUR_MS;
	const end = Math.ceil(Math.max(...ends) / HOUR_MS) * HOUR_MS;
	if (day === undefined) return { start, end };
	return { start: Math.max(start, day), end: Math.min(end, day + DAY_MS) };
};

/** 目盛りの時刻（range.start から stepMinutes ごと。range.end は含まない） */
export const buildTicks = (range: Interval, stepMinutes: number): number[] => {
	const ticks: number[] = [];
	for (let t = range.start; t < range.end; t += stepMinutes * MINUTE_MS) {
		ticks.push(t);
	}
	return ticks;
};

export const isHourTick = (ms: number): boolean => ms % HOUR_MS === 0;

/**
 * 同じ行の中で時間が重なるシフトを、別の段（lane）に振り分ける。
 *
 * greedy first-fit：段ごとに最後に置いたシフトの終了時刻を持ち、終わっている（end <= start）段のうち
 * いちばん上に置く。空きがなければ新しい段を作る。開始順に処理すれば段の数は最小になる。
 * 終了と次の開始がちょうど同じ時刻なら、同じ段に並べる。
 *
 * 出典：Love-Rox/kichijitsu の apps/web/src/layout/packColumns.ts（assignColumns。MIT License）
 *
 * @param intervals 開始時刻の早い順に並んだ時間帯
 * @returns intervals と同じ順で、それぞれを置く段の番号（0 始まり）
 */
export const assignLanes = (intervals: Interval[]): number[] => {
	const laneEnds: number[] = [];
	return intervals.map(({ start, end }) => {
		const free = laneEnds.findIndex((laneEnd) => laneEnd <= start);
		const lane = free === -1 ? laneEnds.length : free;
		laneEnds[lane] = end;
		return lane;
	});
};

/**
 * 表示期間を「重なっている人数が変わらない区間」に分ける（FR-4-D の充足バッジ用）。
 * 人数が 0 の区間も含め、range を隙間なく覆う。隣り合う区間の人数は必ず違う。
 * key（スタッフの id）が同じものは 1 人と数える（同じ人の重複した割り当てで、足りているように見せない）
 */
export const coverageSegments = (
	intervals: (Interval & { key?: string })[],
	range: Interval,
): CoverageSegment[] => {
	// 区間の境目になりうる時刻（range の中だけ）
	const points = new Set([range.start, range.end]);
	for (const { start, end } of intervals) {
		if (start > range.start && start < range.end) points.add(start);
		if (end > range.start && end < range.end) points.add(end);
	}
	const sorted = [...points].sort((a, b) => a - b);

	const segments: CoverageSegment[] = [];
	for (let i = 0; i < sorted.length - 1; i++) {
		const start = sorted[i];
		const end = sorted[i + 1];
		const covering = intervals.filter(
			(interval) => interval.start <= start && interval.end >= end,
		);
		const count = new Set(
			covering.map((interval, index) => interval.key ?? `#${index}`),
		).size;
		const last = segments.at(-1);
		if (last && last.count === count) last.end = end;
		else segments.push({ start, end, count });
	}
	return segments;
};

const toRow = (
	id: string,
	label: string,
	shifts: Shift[],
	lookup: { positions: Map<string, Position>; staffs: Map<string, Staff> },
	color?: string,
	requiredCount?: number,
): TimelineRow => {
	const sorted = shifts
		.map((shift) => ({
			shift,
			start: toMs(shift.timeRange.start),
			end: toMs(shift.timeRange.end),
		}))
		.sort((a, b) => a.start - b.start || a.end - b.end);
	const lanes = assignLanes(sorted);
	const items = sorted.map((item, index) => ({
		...item,
		position: lookup.positions.get(item.shift.positionId),
		staff: lookup.staffs.get(item.shift.staffId),
		lane: lanes[index] ?? 0,
	}));
	const laneCount = Math.max(1, ...items.map((item) => item.lane + 1));
	return { id, label, color, items, laneCount, requiredCount };
};

/**
 * 縦軸（FR-1-2）に合わせて行を作る。持ち場別なら持ち場ごと、スタッフ別ならスタッフごとに 1 行。
 * シフトのない持ち場・スタッフも、空いていることがわかるよう行として残す
 */
export const buildRows = (
	axis: TimelineAxis,
	shifts: Shift[],
	positions: Position[],
	staffs: Staff[],
): TimelineRow[] => {
	const lookup = {
		positions: new Map(positions.map((position) => [position.id, position])),
		staffs: new Map(staffs.map((staff) => [staff.id, staff])),
	};
	if (axis === "position") {
		return positions.map((position) =>
			toRow(
				position.id,
				position.name,
				shifts.filter((shift) => shift.positionId === position.id),
				lookup,
				position.color,
				position.requiredStaffCount,
			),
		);
	}
	return staffs.map((staff) =>
		toRow(
			staff.id,
			staff.name,
			shifts.filter((shift) => shift.staffId === staff.id),
			lookup,
		),
	);
};

/** 背景色の上で読みやすい文字色（黒か白）。WCAG の相対輝度で決める */
export const readableTextColor = (hex: string | undefined): string => {
	const match = /^#?([0-9a-f]{6})$/i.exec(hex ?? "");
	if (!match) return "#000000";
	const channels = [0, 2, 4].map((i) => {
		const c = Number.parseInt(match[1].slice(i, i + 2), 16) / 255;
		return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
	});
	const luminance =
		0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2];
	// 黒との対比と白との対比を比べ、大きいほうを選ぶ
	return (luminance + 0.05) / 0.05 >= 1.05 / (luminance + 0.05)
		? "#000000"
		: "#ffffff";
};
