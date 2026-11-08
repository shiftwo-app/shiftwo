import {
	Fragment,
	useEffect,
	useId,
	useLayoutEffect,
	useMemo,
	useRef,
	useState,
} from "react";
import type { KeyboardEvent, PointerEvent, RefObject } from "react";
import { useIntlLocale, useT } from "../lib/i18n/react";
import type { MessageKey } from "../lib/i18n/messages";
import { type Position, type Shift, ShiftStatus, type Staff } from "../types";
import {
	buildRows,
	buildTicks,
	computeDisplayRange,
	type CoverageSegment,
	coverageSegments,
	formatDayIn,
	assignLanes,
	formatTime,
	toMs,
	isHourTick,
	listShiftDays,
	MINUTE_MS,
	shiftsOnDay,
	stepZoom,
	type TimelineAxis,
	type TimelineItem,
	ZOOM_OPTIONS,
	type ZoomMinutes,
} from "./timeline/layout";
import Avatar from "./Avatar";
import { asTimed, type Session } from "./timetable/session";
import { roomColor, roomsOf } from "../lib/timetable";
import { applyDrag, type DragMode } from "./timeline/snap";
import {
	accumulateWheelZoom,
	wheelDeltaToPx,
	zoomedScrollOffset,
} from "./timeline/wheelZoom";

/** 編集モードのときに渡す。渡さなければ閲覧だけ */
export interface TimelineEditing {
	/** 時間を変えたとき。保存できたら true（できなければ表示を元に戻す） */
	onChangeTime: (shift: Shift, start: number, end: number) => Promise<boolean>;
	/** Delete キーで消したとき */
	onDelete: (shift: Shift) => void;
}

interface ShiftTimelineProps {
	shifts: Shift[];
	positions: Position[];
	staffs: Staff[];
	/** ShiftSetting.timeUnitMinutes。ズームの初期値と、編集のときの吸着の刻みに使う */
	timeUnitMinutes: number;
	editing?: TimelineEditing;
	/** 希望と違う割り当て（FR-4-E）：シフトの ID → 理由。シフトを編集できる人にだけ届く */
	preferenceConflicts?: Record<string, string[]>;
	/** 持ち場を使うか。使わないなら、スタッフ別だけを出し、必要人数も出さない */
	positionsEnabled?: boolean;
	/** イベントのタイムテーブル（FR-6-C）。部屋ごとの行として、シフトの上に重ねて出す */
	sessions?: Session[];
}

/** 1 目盛りの幅（px）。ズームを変えると 1 分あたりの幅が変わる */
const TICK_WIDTH_PX = 40;
const LANE_HEIGHT_PX = 40;
/** 持ち場別の行の上に出す、充足バッジの帯の高さ */
const BADGE_BAND_HEIGHT_PX = 22;
/** タイムテーブルの行の 1 段の高さ */
const SESSION_LANE_HEIGHT_PX = 28;
/** 編集モードで表示期間の前後に足す余白 */
const EDIT_PADDING_MS = 60 * 60_000;
const DAY_MS = 24 * 60 * 60_000;
/** 行の見出し（持ち場名・スタッフ名）の幅。横にスクロールしても左に残る */
const HEADER_WIDTH_PX = 160;
/**
 * 行の見出しの幅は CSS 変数（--header-w）で持ち、狭い画面（スマホ）では細くする。
 * 計算に使うときは、実際の値を要素から読む
 */
const HEADER_WIDTH_CLASS = "[--header-w:112px] sm:[--header-w:160px]";
const headerWidthOf = (el: HTMLElement): number =>
	Number.parseFloat(getComputedStyle(el).getPropertyValue("--header-w")) ||
	HEADER_WIDTH_PX;

const AXIS_LABELS: Record<TimelineAxis, MessageKey> = {
	position: "board.axisPosition",
	staff: "board.axisStaff",
};

/** 切り替えボタンの並び（日付・縦軸）。選ばれているものは墨の地に白抜き */
const SEGMENT_GROUP =
	"inline-flex flex-wrap rounded-md border border-line-strong bg-surface p-0.5";
const segmentItem = (active: boolean) =>
	`inline-flex h-7 cursor-pointer items-center rounded px-3 text-xs whitespace-nowrap transition-colors ${active ? "bg-ink font-bold text-paper" : "text-ink-muted hover:bg-surface-sunken hover:text-ink"}`;

/**
 * 時刻の見出しの文字。正時は「10:00」、それ以外は「:15」のように分だけにして、1 目盛り（40px）に収める。
 * 5 分きざみでは 15 分ごとにだけ出す（線は全部引く）
 */
const tickLabel = (tick: number, zoom: ZoomMinutes): string | null => {
	const text = formatTime(tick);
	if (isHourTick(tick)) return text;
	const minutes = text.slice(-2);
	if (zoom < 10 && Number(minutes) % 15 !== 0) return null;
	return `:${minutes}`;
};

const toZoom = (minutes: number): ZoomMinutes =>
	ZOOM_OPTIONS.find((option) => option === minutes) ?? 15;

/** ブラウザに表示されてから現在時刻を持つ（SSR とハイドレーションで値がずれないように） */
const useNow = (intervalMs = 30_000): number | null => {
	const [now, setNow] = useState<number | null>(null);
	useEffect(() => {
		setNow(Date.now());
		const timer = setInterval(() => setNow(Date.now()), intervalMs);
		return () => clearInterval(timer);
	}, [intervalMs]);
	return now;
};

/**
 * ⌘/Ctrl + ホイールでズームする（FR-1-3）。ブラウザのページズームと重なるので preventDefault が要り、
 * そのため React の onWheel ではなく passive: false で登録する（kichijitsu の WeekGrid と同じ）
 */
const useWheelZoom = (
	scrollRef: RefObject<HTMLDivElement | null>,
	zoom: ZoomMinutes,
	setZoom: (zoom: ZoomMinutes) => void,
	pendingScrollRef: RefObject<number | null>,
) => {
	const accumRef = useRef(0);
	// 同じフレームに wheel が何度も届いても取りこぼさないよう、次に頼んだ値も書き戻す
	const zoomRef = useRef(zoom);
	zoomRef.current = zoom;

	useEffect(() => {
		const el = scrollRef.current;
		if (!el) return;
		const handleWheel = (event: WheelEvent) => {
			if (!event.ctrlKey && !event.metaKey) return;
			event.preventDefault();
			const { accumPx, direction } = accumulateWheelZoom(
				accumRef.current,
				wheelDeltaToPx(event.deltaY, event.deltaMode),
			);
			accumRef.current = accumPx;
			if (direction === 0) return;
			const current = zoomRef.current;
			const next = stepZoom(current, direction);
			if (next === current) return;
			const anchorPx = event.clientX - el.getBoundingClientRect().left;
			// 1 分あたりの px は TICK_WIDTH_PX / zoom
			pendingScrollRef.current = zoomedScrollOffset(
				el.scrollLeft,
				anchorPx,
				headerWidthOf(el),
				TICK_WIDTH_PX / current,
				TICK_WIDTH_PX / next,
			);
			zoomRef.current = next;
			setZoom(next);
		};
		el.addEventListener("wheel", handleWheel, { passive: false });
		return () => el.removeEventListener("wheel", handleWheel);
	}, [scrollRef, setZoom, pendingScrollRef]);
};

const ShiftTimeline = ({
	shifts,
	positions,
	staffs,
	timeUnitMinutes,
	editing,
	preferenceConflicts,
	positionsEnabled = true,
	sessions = [],
}: ShiftTimelineProps) => {
	const t = useT();
	const intlLocale = useIntlLocale();
	const [selectedAxis, setAxis] = useState<TimelineAxis>("position");
	// 持ち場を使わない単位では、スタッフ別だけ
	const axis: TimelineAxis = positionsEnabled ? selectedAxis : "staff";
	const [zoom, setZoom] = useState<ZoomMinutes>(toZoom(timeUnitMinutes));
	const zoomSelectId = useId();
	const now = useNow();
	const scrollRef = useRef<HTMLDivElement>(null);
	const pendingScrollRef = useRef<number | null>(null);
	useWheelZoom(scrollRef, zoom, setZoom, pendingScrollRef);

	// ズームを当てた後、wheel のときに決めたスクロール位置に合わせる（描画と同じコミットで）
	useLayoutEffect(() => {
		const el = scrollRef.current;
		if (el && pendingScrollRef.current !== null) {
			el.scrollLeft = pendingScrollRef.current;
			pendingScrollRef.current = null;
		}
	}, [zoom]);

	// タイムテーブル（FR-6-C）を重ねるか。重ねるときは、セッションの日と時間帯も表示の範囲に入れる
	const [showSessions, setShowSessions] = useState(true);
	const overlay = showSessions && sessions.length > 0;
	const timedSessions = useMemo(() => sessions.map(asTimed), [sessions]);
	const allRooms = useMemo(() => roomsOf(sessions), [sessions]);

	// 複数日のイベントは 1 日ずつ表示する。最初はシフトのある最初の日
	const days = useMemo(
		() => listShiftDays(overlay ? [...shifts, ...timedSessions] : shifts),
		[shifts, timedSessions, overlay],
	);
	const [selectedDay, setSelectedDay] = useState<number | undefined>(days[0]);
	const day =
		selectedDay !== undefined && days.includes(selectedDay)
			? selectedDay
			: days[0];
	const dayShifts = useMemo(
		() => (day === undefined ? shifts : shiftsOnDay(shifts, day)),
		[shifts, day],
	);
	const daySessions = useMemo(
		() =>
			!overlay
				? []
				: day === undefined
					? timedSessions
					: shiftsOnDay(timedSessions, day),
		[overlay, timedSessions, day],
	);
	const sessionRows = useMemo(
		() =>
			allRooms
				.map((room, index) => {
					const items = daySessions
						.filter((session) => session.room === room)
						.sort((a, b) => toMs(a.start) - toMs(b.start));
					const lanes = assignLanes(
						items.map((item) => ({
							start: toMs(item.start),
							end: toMs(item.end),
						})),
					);
					return {
						room,
						color: roomColor(index),
						items,
						lanes,
						laneCount: Math.max(1, ...lanes.map((lane) => lane + 1)),
					};
				})
				.filter((row) => row.items.length > 0),
		[allRooms, daySessions],
	);

	// 編集中は前後に 1 時間ずつ余白を足し、端のシフトも外側へ動かせるようにする（その日の中で）
	const isEditing = editing !== undefined;
	const range = useMemo(() => {
		const base = computeDisplayRange(
			[...dayShifts, ...daySessions],
			undefined,
			day,
		);
		if (!isEditing) return base;
		const padded = {
			start: base.start - EDIT_PADDING_MS,
			end: base.end + EDIT_PADDING_MS,
		};
		if (day === undefined) return padded;
		return {
			start: Math.max(padded.start, day),
			end: Math.min(padded.end, day + DAY_MS),
		};
	}, [dayShifts, daySessions, day, isEditing]);
	const ticks = useMemo(() => buildTicks(range, zoom), [range, zoom]);
	const rows = useMemo(
		() =>
			buildRows(axis, dayShifts, positions, staffs, t("board.unassignedRow")),
		[axis, dayShifts, positions, staffs, t],
	);

	const pxPerMs = TICK_WIDTH_PX / (zoom * MINUTE_MS);
	const width = (range.end - range.start) * pxPerMs;
	const toX = (ms: number) => (ms - range.start) * pxPerMs;
	const showNow = now !== null && now >= range.start && now < range.end;

	return (
		<section aria-label={t("board.timelineLabel")} className="space-y-3">
			<div className="flex flex-wrap items-center gap-x-4 gap-y-2">
				{days.length > 1 && (
					<div
						role="group"
						aria-label={t("board.dayGroup")}
						className={SEGMENT_GROUP}
					>
						{days.map((value) => (
							<button
								key={value}
								type="button"
								aria-pressed={value === day}
								onClick={() => setSelectedDay(value)}
								className={`${segmentItem(value === day)} tabular`}
							>
								{formatDayIn(value, intlLocale)}
							</button>
						))}
					</div>
				)}
				{positionsEnabled && (
					<fieldset className={SEGMENT_GROUP}>
						<legend className="sr-only">{t("board.axisLegend")}</legend>
						{(Object.keys(AXIS_LABELS) as TimelineAxis[]).map((value) => (
							<label
								key={value}
								// ラジオボタンは見えなくしても残し、キーボードと読み上げはそのまま使えるようにする
								className={`${segmentItem(axis === value)} has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-1 has-[:focus-visible]:outline-primary`}
							>
								<input
									type="radio"
									name="timeline-axis"
									value={value}
									checked={axis === value}
									onChange={() => setAxis(value)}
									className="sr-only"
								/>
								{t(AXIS_LABELS[value])}
							</label>
						))}
					</fieldset>
				)}
				{sessions.length > 0 && (
					<label className="flex items-center gap-2 text-xs text-ink-muted">
						<input
							type="checkbox"
							checked={showSessions}
							onChange={(event) => setShowSessions(event.target.checked)}
							className="size-4 accent-primary"
						/>
						{t("timetable.overlayToggle")}
					</label>
				)}
				<label
					htmlFor={zoomSelectId}
					className="flex items-center gap-2 text-xs text-ink-muted"
				>
					{t("board.zoomLabel")}
					<select
						id={zoomSelectId}
						value={zoom}
						onChange={(event) => setZoom(toZoom(Number(event.target.value)))}
						className="control h-8 py-0 text-xs tabular"
					>
						{ZOOM_OPTIONS.map((option) => (
							<option key={option} value={option}>
								{t("board.zoomOption", { minutes: option })}
							</option>
						))}
					</select>
				</label>
			</div>

			<div
				ref={scrollRef}
				className={`overflow-x-auto rounded-lg border border-line bg-surface ${HEADER_WIDTH_CLASS}`}
			>
				<div
					className="relative"
					style={{ width: `calc(var(--header-w) + ${width}px)` }}
				>
					{/* 時刻の見出し（駅の発車標のような、濃い地の帯） */}
					<div className="sticky top-0 z-20 flex bg-board-head text-board-head-ink">
						<div
							className="sticky left-0 z-30 flex shrink-0 items-center border-r border-board-head-ink/20 bg-board-head px-3 text-xs font-bold"
							style={{ width: "var(--header-w)" }}
						>
							{t(AXIS_LABELS[axis])}
						</div>
						<div className="relative h-9 tabular" style={{ width }}>
							{ticks.map((tick, index) => {
								const hour = isHourTick(tick);
								// 左端の文字は左にそろえて置くので、そのすぐ右の細かい目盛りの文字とくっつく。そこだけ出さない
								const besideStart = index === 1 && !hour && toX(ticks[0]) <= 0;
								const text = besideStart ? null : tickLabel(tick, zoom);
								// 文字は目盛りの線の真上に、中央をそろえて置く（左端の目盛りだけは、切れないよう左にそろえる）。
								// 帯の下の端には、下の罫線につながる短い目盛りを付ける
								const x = toX(tick);
								const atStart = x <= 0;
								return (
									<Fragment key={tick}>
										{text && (
											<span
												className={`absolute top-1.5 leading-none whitespace-nowrap ${atStart ? "pl-1" : "-translate-x-1/2"} ${hour ? "text-xs font-bold" : "text-[10px] opacity-60"}`}
												style={{ left: x }}
											>
												{text}
											</span>
										)}
										<span
											aria-hidden="true"
											className={`absolute bottom-0 w-px ${hour ? "h-2.5 bg-board-head-ink/60" : "h-1.5 bg-board-head-ink/30"}`}
											style={{ left: x }}
										/>
									</Fragment>
								);
							})}
							{showNow && (
								<span
									aria-hidden
									className="pointer-events-none absolute top-1/2 z-10 -translate-x-1/2 -translate-y-1/2 rounded-full bg-brand px-1.5 text-[10px] leading-4 font-bold text-white"
									style={{ left: toX(now) }}
								>
									{t("board.now")}
								</span>
							)}
						</div>
					</div>

					{/* タイムテーブル（FR-6-C）：部屋ごとの行。セッションは透ける色で重ねる */}
					{sessionRows.length > 0 && (
						<ul
							aria-label={t("timetable.overlayRows")}
							className="border-b-2 border-line-strong bg-surface-sunken/60"
						>
							{sessionRows.map((row) => (
								<li
									key={row.room}
									className="flex border-b border-line last:border-b-0"
								>
									<div
										className="sticky left-0 z-[15] flex shrink-0 items-center gap-2 border-r border-line bg-surface-sunken py-1 pr-2 pl-3 text-xs"
										style={{ width: "var(--header-w)" }}
									>
										<span
											aria-hidden
											className="size-2.5 shrink-0 rounded-full"
											style={{ backgroundColor: row.color }}
										/>
										<span className="truncate font-bold text-ink-muted">
											{row.room}
										</span>
									</div>
									<ul
										aria-label={t("timetable.overlayRoom", { room: row.room })}
										className="relative"
										style={{
											width,
											height: row.laneCount * SESSION_LANE_HEIGHT_PX,
										}}
									>
										{row.items.map((item, index) => {
											const start = Math.max(toMs(item.start), range.start);
											const end = Math.min(toMs(item.end), range.end);
											if (end <= start) return null;
											const accent = item.trackColor ?? row.color;
											const label = t("timetable.sessionLabel", {
												time: `${formatTime(toMs(item.start))}–${formatTime(toMs(item.end))}`,
												title: item.title,
												speaker: item.speaker,
											});
											return (
												<li
													key={item.id}
													title={label}
													className="absolute flex items-center overflow-hidden rounded px-1.5 text-[11px] leading-tight text-ink"
													style={{
														left: toX(start) + 1,
														width: Math.max((end - start) * pxPerMs - 2, 4),
														top: row.lanes[index]! * SESSION_LANE_HEIGHT_PX + 3,
														height: SESSION_LANE_HEIGHT_PX - 6,
														borderLeft: `3px solid ${accent}`,
														backgroundColor: `color-mix(in srgb, ${accent} 16%, transparent)`,
													}}
												>
													<span className="sr-only">{label}</span>
													<span aria-hidden className="truncate">
														{item.title}
													</span>
												</li>
											);
										})}
									</ul>
								</li>
							))}
						</ul>
					)}

					{/* 行 */}
					<ul aria-label={t("board.rowsLabel", { axis: t(AXIS_LABELS[axis]) })}>
						{rows.map((row) => (
							<li
								key={row.id}
								className="flex border-b border-line last:border-b-0"
							>
								<div
									className="sticky left-0 z-[15] flex shrink-0 items-center gap-2 border-r border-line bg-surface py-1 pr-2 pl-3 text-sm"
									style={{ width: "var(--header-w)" }}
								>
									{row.color && (
										<span
											aria-hidden
											className="absolute inset-y-0 left-0 w-1"
											style={{ backgroundColor: row.color }}
										/>
									)}
									{axis === "staff" && (
										<Avatar name={row.label} url={row.avatarUrl} size={22} />
									)}
									<span className="truncate font-bold text-ink">
										{row.label}
									</span>
								</div>
								<div
									className="relative"
									style={{
										width,
										height:
											row.laneCount * LANE_HEIGHT_PX +
											(row.requiredCount !== undefined
												? BADGE_BAND_HEIGHT_PX
												: 0),
									}}
								>
									{ticks.map((tick) => (
										<span
											key={tick}
											aria-hidden
											className={`absolute top-0 h-full border-l ${isHourTick(tick) ? "border-line-strong" : "border-line"}`}
											style={{ left: toX(tick) }}
										/>
									))}
									{row.requiredCount !== undefined && (
										<StaffingBand
											label={row.label}
											requiredCount={row.requiredCount}
											segments={coverageSegments(
												row.items.map((item) => ({
													start: item.start,
													end: item.end,
													key: item.shift.staffId,
												})),
												range,
											)}
											toX={toX}
										/>
									)}
									<ul
										aria-label={t("board.rowShifts", { label: row.label })}
										className="absolute inset-x-0 bottom-0"
										style={{
											top:
												row.requiredCount !== undefined
													? BADGE_BAND_HEIGHT_PX
													: 0,
										}}
									>
										{row.items.map((item) => (
											<ShiftBlock
												key={item.shift.id}
												item={item}
												axis={axis}
												range={range}
												pxPerMs={pxPerMs}
												unitMinutes={timeUnitMinutes}
												editing={editing}
												conflicts={preferenceConflicts?.[item.shift.id]}
											/>
										))}
									</ul>
								</div>
							</li>
						))}
					</ul>

					{/* 現在時刻（FR-1-5）。行の見出しより下、シフトより上に引く */}
					{showNow && (
						<div
							aria-hidden
							className="pointer-events-none absolute top-0 bottom-0 z-10 w-0.5 -translate-x-1/2 bg-brand"
							style={{ left: `calc(var(--header-w) + ${toX(now)}px)` }}
						/>
					)}
				</div>
			</div>

			<div className="space-y-1 text-xs leading-relaxed text-ink-muted">
				<ul
					aria-label={t("board.legendLabel")}
					className="flex flex-wrap gap-x-4 gap-y-1"
				>
					<li className="flex items-center gap-1.5">
						<span
							aria-hidden
							className="inline-block h-3 w-5 rounded-sm border border-dashed border-ink-muted"
						/>
						{t("board.legendDraft")}
					</li>
					<li className="flex items-center gap-1.5">
						<span
							aria-hidden
							className="inline-block h-3 w-5 rounded-sm border border-line-strong ring-2 ring-warn"
						/>
						{t("board.legendOverridden")}
					</li>
					{positionsEnabled && (
						<li className="flex items-center gap-1.5">
							<span
								aria-hidden
								className="inline-block h-3 w-5 rounded-sm bg-danger-soft ring-1 ring-danger/40"
							/>
							{t("board.legendShort")}
						</li>
					)}
					{sessionRows.length > 0 && (
						<li className="flex items-center gap-1.5">
							<span
								aria-hidden
								className="inline-block h-3 w-5 rounded-sm border-l-[3px] border-ink-muted bg-ink-muted/15"
							/>
							{t("timetable.overlayRows")}
						</li>
					)}
					<li className="flex items-center gap-1.5">
						<span aria-hidden className="inline-block h-3 w-0.5 bg-brand" />
						{t("board.legendNow")}
					</li>
				</ul>
				<p>
					{positionsEnabled && t("board.helpStaffing")}
					{t("board.helpZoom")}
					{editing && t("board.helpEditing")}
				</p>
			</div>
		</section>
	);
};

/** 持ち場の行の上に、時間帯ごとの「入っている人数 / 必要な人数」を出す（FR-4-D） */
const StaffingBand = ({
	label,
	requiredCount,
	segments,
	toX,
}: {
	label: string;
	requiredCount: number;
	segments: CoverageSegment[];
	toX: (ms: number) => number;
}) => {
	const t = useT();
	return (
		<ul
			aria-label={t("board.staffingLabel", { label })}
			className="absolute inset-x-0 top-0"
			style={{ height: BADGE_BAND_HEIGHT_PX }}
		>
			{segments.map((segment) => {
				const short = segment.count < requiredCount;
				const text = `${segment.count}/${requiredCount}`;
				const timeRange = t("board.timeRange", {
					start: formatTime(segment.start),
					end: formatTime(segment.end),
				});
				return (
					<li
						key={segment.start}
						aria-label={`${t("board.staffingSegment", { range: timeRange, count: segment.count, required: requiredCount })}${short ? t("board.staffingShortSuffix") : ""}`}
						title={t("board.staffingTitle", { range: timeRange, text })}
						className={`absolute top-0.5 flex items-center justify-center overflow-hidden rounded-sm text-[11px] leading-none font-bold tabular ${short ? "bg-danger-soft text-danger ring-1 ring-danger/40 ring-inset" : "bg-primary-soft text-ink"}`}
						style={{
							left: toX(segment.start) + 1,
							width: Math.max(toX(segment.end) - toX(segment.start) - 2, 2),
							height: BADGE_BAND_HEIGHT_PX - 4,
						}}
					>
						{text}
					</li>
				);
			})}
		</ul>
	);
};

const ShiftBlock = ({
	item,
	axis,
	range,
	pxPerMs,
	unitMinutes,
	editing,
	conflicts,
}: {
	item: TimelineItem;
	axis: TimelineAxis;
	range: { start: number; end: number };
	pxPerMs: number;
	unitMinutes: number;
	editing?: TimelineEditing;
	/** スタッフの希望と違うところ（なければ undefined） */
	conflicts?: string[];
}) => {
	const t = useT();
	const { shift, position, staff } = item;
	// ドラッグ中・保存中は、動かした先を仮に表示する。保存後にデータが変われば消す
	const [preview, setPreview] = useState<{ start: number; end: number } | null>(
		null,
	);
	const dragRef = useRef<{
		mode: DragMode;
		originX: number;
		original: { start: number; end: number };
	} | null>(null);
	useEffect(() => setPreview(null), [item.start, item.end]);

	const shown = preview ?? { start: item.start, end: item.end };
	const isDraft = shift.status === ShiftStatus.draft;
	const color = position?.color ?? "var(--line-strong)";
	// 持ち場別の行ではスタッフ名、スタッフ別の行では持ち場名を出す
	const title = axis === "position" ? staff?.name : position?.name;
	const time = t("board.timeRange", {
		start: formatTime(shown.start),
		end: formatTime(shown.end),
	});
	// 希望と違う割り当て：手で付けた「希望外」か、スタッフの希望（持ち場・休憩）と違うもの
	const overridden = !shift.isPreferredPosition || (conflicts?.length ?? 0) > 0;
	const notes = [
		isDraft ? t("board.noteDraft") : undefined,
		shift.isPreferredPosition ? undefined : t("board.noteOverridden"),
		...(conflicts ?? []),
	].filter(Boolean);
	const label = [staff?.name, position?.name, time, ...notes]
		.filter(Boolean)
		.join(t("board.listSeparator"));

	const left = (Math.max(shown.start, range.start) - range.start) * pxPerMs;
	const width =
		(Math.min(shown.end, range.end) - Math.max(shown.start, range.start)) *
		pxPerMs;

	const commit = async (next: { start: number; end: number }) => {
		if (!editing) return;
		if (next.start === item.start && next.end === item.end) {
			setPreview(null);
			return;
		}
		setPreview(next);
		const saved = await editing.onChangeTime(shift, next.start, next.end);
		if (!saved) setPreview(null);
	};

	const startDrag = (mode: DragMode) => (event: PointerEvent<HTMLElement>) => {
		if (!editing || event.button !== 0) return;
		event.preventDefault();
		event.stopPropagation();
		event.currentTarget.setPointerCapture(event.pointerId);
		dragRef.current = {
			mode,
			originX: event.clientX,
			original: { start: item.start, end: item.end },
		};
	};

	const dragTo = (event: PointerEvent<HTMLElement>) => {
		const drag = dragRef.current;
		if (!drag) return null;
		return applyDrag(
			drag.mode,
			drag.original,
			(event.clientX - drag.originX) / pxPerMs,
			unitMinutes,
		);
	};

	const handleKeyDown = (event: KeyboardEvent<HTMLElement>) => {
		if (!editing) return;
		if (event.key === "Delete" || event.key === "Backspace") {
			event.preventDefault();
			editing.onDelete(shift);
			return;
		}
		if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
		event.preventDefault();
		const delta =
			(event.key === "ArrowLeft" ? -1 : 1) * unitMinutes * MINUTE_MS;
		void commit(
			applyDrag(
				event.shiftKey ? "resize-end" : "move",
				shown,
				delta,
				unitMinutes,
			),
		);
	};

	return (
		<li
			// キーボードでたどって読み上げられるように、フォーカスできるようにする
			tabIndex={0}
			aria-label={label}
			aria-keyshortcuts={
				editing
					? "ArrowLeft ArrowRight Shift+ArrowLeft Shift+ArrowRight Delete"
					: undefined
			}
			title={label}
			onPointerDown={startDrag("move")}
			onPointerMove={(event) => {
				const next = dragTo(event);
				if (next) setPreview(next);
			}}
			onPointerUp={(event) => {
				const next = dragTo(event);
				dragRef.current = null;
				if (next) void commit(next);
			}}
			onPointerCancel={() => {
				dragRef.current = null;
				setPreview(null);
			}}
			onKeyDown={handleKeyDown}
			// 塗りは持ち場の色を面の色に混ぜた淡い色、左端に持ち場の色の太い線。文字は墨にして、
			// どの持ち場の色でも（ダークモードでも）読めるようにする
			className={`absolute flex flex-col justify-center overflow-hidden rounded-sm border border-l-4 pr-1 pl-1.5 text-xs leading-tight text-ink select-none transition-shadow hover:shadow-md focus:outline-2 focus:outline-offset-2 focus:outline-primary ${isDraft ? "border-dashed border-ink-muted" : "border-transparent"} ${overridden ? "ring-2 ring-warn" : ""} ${editing ? "cursor-grab touch-none active:cursor-grabbing" : ""} ${preview ? "opacity-80 shadow-lg" : ""}`}
			style={{
				left,
				width: Math.max(width - 2, 4),
				top: item.lane * LANE_HEIGHT_PX + 4,
				height: LANE_HEIGHT_PX - 8,
				backgroundColor: `color-mix(in srgb, ${color} ${isDraft ? 12 : 22}%, var(--surface))`,
				borderLeftColor: color,
			}}
		>
			<span className="flex items-center gap-1 truncate font-bold">
				{axis === "position" && staff && (
					<Avatar
						name={staff.name}
						url={(staff as Staff & { avatarUrl?: string | null }).avatarUrl}
						size={14}
					/>
				)}
				<span className="truncate">{title}</span>
			</span>
			<span className="block truncate text-ink-muted tabular">{time}</span>
			{editing && (
				<span
					aria-hidden
					onPointerDown={startDrag("resize-end")}
					className="absolute top-0 right-0 h-full w-2 cursor-ew-resize bg-ink/10 hover:bg-ink/25"
				/>
			)}
		</li>
	);
};

export default ShiftTimeline;
