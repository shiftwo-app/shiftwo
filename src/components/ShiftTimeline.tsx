import {
	useEffect,
	useId,
	useLayoutEffect,
	useMemo,
	useRef,
	useState,
} from "react";
import type { RefObject } from "react";
import { type Role, type Shift, ShiftStatus, type Staff } from "../types";
import {
	buildRows,
	buildTicks,
	computeDisplayRange,
	type CoverageSegment,
	coverageSegments,
	formatDay,
	formatTime,
	isHourTick,
	listShiftDays,
	MINUTE_MS,
	readableTextColor,
	shiftsOnDay,
	stepZoom,
	type TimelineAxis,
	type TimelineItem,
	ZOOM_OPTIONS,
	type ZoomMinutes,
} from "./timeline/layout";
import {
	accumulateWheelZoom,
	wheelDeltaToPx,
	zoomedScrollOffset,
} from "./timeline/wheelZoom";

interface ShiftTimelineProps {
	shifts: Shift[];
	roles: Role[];
	staffs: Staff[];
	/** ShiftSetting.timeUnitMinutes。ズームの初期値に使う */
	timeUnitMinutes: number;
}

/** 1 目盛りの幅（px）。ズームを変えると 1 分あたりの幅が変わる */
const TICK_WIDTH_PX = 40;
const LANE_HEIGHT_PX = 40;
/** 役割別の行の上に出す、充足バッジの帯の高さ */
const BADGE_BAND_HEIGHT_PX = 22;
/** 行の見出し（役割名・スタッフ名）の幅。横にスクロールしても左に残る */
const HEADER_WIDTH_PX = 160;

const AXIS_LABELS: Record<TimelineAxis, string> = {
	role: "役割別",
	staff: "スタッフ別",
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
				HEADER_WIDTH_PX,
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
	roles,
	staffs,
	timeUnitMinutes,
}: ShiftTimelineProps) => {
	const [axis, setAxis] = useState<TimelineAxis>("role");
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

	// 複数日のイベントは 1 日ずつ表示する。最初はシフトのある最初の日
	const days = useMemo(() => listShiftDays(shifts), [shifts]);
	const [selectedDay, setSelectedDay] = useState<number | undefined>(days[0]);
	const day =
		selectedDay !== undefined && days.includes(selectedDay)
			? selectedDay
			: days[0];
	const dayShifts = useMemo(
		() => (day === undefined ? shifts : shiftsOnDay(shifts, day)),
		[shifts, day],
	);

	const range = useMemo(
		() => computeDisplayRange(dayShifts, undefined, day),
		[dayShifts, day],
	);
	const ticks = useMemo(() => buildTicks(range, zoom), [range, zoom]);
	const rows = useMemo(
		() => buildRows(axis, dayShifts, roles, staffs),
		[axis, dayShifts, roles, staffs],
	);

	const pxPerMs = TICK_WIDTH_PX / (zoom * MINUTE_MS);
	const width = (range.end - range.start) * pxPerMs;
	const toX = (ms: number) => (ms - range.start) * pxPerMs;
	const showNow = now !== null && now >= range.start && now < range.end;

	return (
		<section aria-label="シフトのタイムライン" className="space-y-3">
			<div className="flex flex-wrap items-center gap-4">
				{days.length > 1 && (
					<div role="group" aria-label="日付" className="flex gap-1">
						{days.map((value) => (
							<button
								key={value}
								type="button"
								aria-pressed={value === day}
								onClick={() => setSelectedDay(value)}
								className={`rounded border px-3 py-1 text-sm ${value === day ? "border-blue-600 bg-blue-600 text-white" : "bg-background"}`}
							>
								{formatDay(value)}
							</button>
						))}
					</div>
				)}
				<fieldset className="flex items-center gap-2">
					<legend className="sr-only">縦軸</legend>
					{(Object.keys(AXIS_LABELS) as TimelineAxis[]).map((value) => (
						<label key={value} className="flex items-center gap-1">
							<input
								type="radio"
								name="timeline-axis"
								value={value}
								checked={axis === value}
								onChange={() => setAxis(value)}
							/>
							{AXIS_LABELS[value]}
						</label>
					))}
				</fieldset>
				<label htmlFor={zoomSelectId} className="flex items-center gap-2">
					目盛り
					<select
						id={zoomSelectId}
						value={zoom}
						onChange={(event) => setZoom(toZoom(Number(event.target.value)))}
						className="rounded border px-2 py-1"
					>
						{ZOOM_OPTIONS.map((option) => (
							<option key={option} value={option}>
								{option} 分
							</option>
						))}
					</select>
				</label>
			</div>

			<div ref={scrollRef} className="overflow-x-auto rounded border">
				<div className="relative" style={{ width: HEADER_WIDTH_PX + width }}>
					{/* 時刻の見出し */}
					<div className="sticky top-0 z-20 flex border-b bg-background">
						<div
							className="sticky left-0 z-30 shrink-0 border-r bg-background px-2 py-1 text-sm font-semibold"
							style={{ width: HEADER_WIDTH_PX }}
						>
							{AXIS_LABELS[axis]}
						</div>
						<div className="relative h-8" style={{ width }}>
							{ticks.map((tick) => (
								<span
									key={tick}
									className={`absolute top-0 h-full border-l pl-1 text-xs ${isHourTick(tick) ? "border-gray-400" : "border-gray-200 text-gray-500"}`}
									style={{ left: toX(tick) }}
								>
									{formatTime(tick)}
								</span>
							))}
						</div>
					</div>

					{/* 行 */}
					<ul aria-label={`${AXIS_LABELS[axis]}の行`}>
						{rows.map((row) => (
							<li key={row.id} className="flex border-b last:border-b-0">
								<div
									className="sticky left-0 z-10 flex shrink-0 items-center gap-2 border-r bg-background px-2 text-sm"
									style={{ width: HEADER_WIDTH_PX }}
								>
									{row.color && (
										<span
											aria-hidden
											className="inline-block h-3 w-3 shrink-0 rounded-sm"
											style={{ backgroundColor: row.color }}
										/>
									)}
									<span className="truncate">{row.label}</span>
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
											className={`absolute top-0 h-full border-l ${isHourTick(tick) ? "border-gray-300" : "border-gray-100"}`}
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
										aria-label={`${row.label}のシフト`}
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
												left={toX(Math.max(item.start, range.start))}
												width={
													(Math.min(item.end, range.end) -
														Math.max(item.start, range.start)) *
													pxPerMs
												}
											/>
										))}
									</ul>
								</div>
							</li>
						))}
					</ul>

					{/* 現在時刻（FR-1-5） */}
					{showNow && (
						<div
							aria-hidden
							className="pointer-events-none absolute top-0 bottom-0 z-10 w-0.5 bg-red-500"
							style={{ left: HEADER_WIDTH_PX + toX(now) }}
						/>
					)}
				</div>
			</div>

			<p className="text-xs text-gray-500">
				点線の枠は下書き、オレンジの枠は希望外の割り当てです。役割別の行の上の数字は「入っている人数
				/ 必要な人数」で、足りない時間帯は赤くなります。⌘ / Ctrl
				を押しながらホイール（ピンチ）でズームできます。
			</p>
		</section>
	);
};

/** 役割の行の上に、時間帯ごとの「入っている人数 / 必要な人数」を出す（FR-4-D） */
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
}) => (
	<ul
		aria-label={`${label}の充足状況`}
		className="absolute inset-x-0 top-0"
		style={{ height: BADGE_BAND_HEIGHT_PX }}
	>
		{segments.map((segment) => {
			const short = segment.count < requiredCount;
			const text = `${segment.count}/${requiredCount}`;
			return (
				<li
					key={segment.start}
					aria-label={`${formatTime(segment.start)}〜${formatTime(segment.end)}、${segment.count} 人 / 必要 ${requiredCount} 人${short ? "、不足" : ""}`}
					title={`${formatTime(segment.start)}〜${formatTime(segment.end)}：${text}`}
					className={`absolute top-0.5 flex items-center justify-center overflow-hidden rounded-sm text-[11px] font-semibold tabular-nums ${short ? "bg-red-100 text-red-700" : "bg-emerald-50 text-emerald-700"}`}
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

const ShiftBlock = ({
	item,
	axis,
	left,
	width,
}: {
	item: TimelineItem;
	axis: TimelineAxis;
	left: number;
	width: number;
}) => {
	const { shift, role, staff } = item;
	const isDraft = shift.status === ShiftStatus.draft;
	// 役割別の行ではスタッフ名、スタッフ別の行では役割名を出す
	const title = axis === "role" ? staff?.name : role?.name;
	const time = `${formatTime(item.start)}〜${formatTime(item.end)}`;
	const notes = [
		isDraft ? "下書き" : undefined,
		shift.isPreferredRole ? undefined : "希望外の割り当て",
	].filter(Boolean);
	const label = [staff?.name, role?.name, time, ...notes]
		.filter(Boolean)
		.join("、");

	return (
		<li
			// キーボードでたどって読み上げられるように、フォーカスできるようにする
			tabIndex={0}
			aria-label={label}
			title={label}
			className={`absolute overflow-hidden rounded px-1 text-xs leading-tight shadow-sm focus:outline-2 focus:outline-offset-1 focus:outline-blue-600 ${isDraft ? "border-2 border-dashed" : "border"} ${shift.isPreferredRole ? "border-gray-700/40" : "border-orange-500 ring-2 ring-orange-400"}`}
			style={{
				left,
				width: Math.max(width - 2, 4),
				top: item.lane * LANE_HEIGHT_PX + 4,
				height: LANE_HEIGHT_PX - 8,
				backgroundColor: role?.color ?? "#cccccc",
				color: readableTextColor(role?.color),
			}}
		>
			<span className="block truncate font-semibold">{title}</span>
			<span className="block truncate">{time}</span>
		</li>
	);
};

export default ShiftTimeline;
