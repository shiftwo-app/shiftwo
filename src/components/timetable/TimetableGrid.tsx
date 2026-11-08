import { useMemo, useState } from "react";
import { useIntlLocale, useT } from "../../lib/i18n/react";
import { roomColor, roomsOf } from "../../lib/timetable";
import {
	assignLanes,
	computeDisplayRange,
	formatDayIn,
	formatTime,
	HOUR_MS,
	listShiftDays,
	shiftsOnDay,
	toMs,
} from "../timeline/layout";
import { asTimed, type Session } from "./session";

/** 1 分あたりの高さ（px） */
const PX_PER_MINUTE = 1.6;

const SEGMENT_GROUP =
	"inline-flex flex-wrap rounded-md border border-line-strong bg-surface p-0.5";
const segmentItem = (active: boolean) =>
	`inline-flex h-7 cursor-pointer items-center rounded px-3 text-xs whitespace-nowrap transition-colors ${active ? "bg-ink font-bold text-paper" : "text-ink-muted hover:bg-surface-sunken hover:text-ink"}`;

/**
 * 部屋ごとに列を並べたタイムテーブル（FR-6-B）。縦が時間、横が部屋（A | B | C …）。
 * 部屋の見出しには色のラベルを付け、複数日のイベントは 1 日ずつ出す
 */
const TimetableGrid = ({ sessions }: { sessions: Session[] }) => {
	const t = useT();
	const intlLocale = useIntlLocale();
	const timed = useMemo(() => sessions.map(asTimed), [sessions]);
	const days = useMemo(() => listShiftDays(timed), [timed]);
	const [selectedDay, setSelectedDay] = useState<number | undefined>(days[0]);
	const day =
		selectedDay !== undefined && days.includes(selectedDay)
			? selectedDay
			: days[0];
	const daySessions = useMemo(
		() => (day === undefined ? timed : shiftsOnDay(timed, day)),
		[timed, day],
	);
	// 列の並びと色は、その日だけでなくイベント全体で決める（日を変えても同じ部屋は同じ色）
	const allRooms = useMemo(() => roomsOf(sessions), [sessions]);
	const rooms = allRooms.filter((room) =>
		daySessions.some((session) => session.room === room),
	);
	const range = computeDisplayRange(daySessions, undefined, day);
	const height = ((range.end - range.start) / 60_000) * PX_PER_MINUTE;
	const toY = (ms: number) =>
		((Math.min(Math.max(ms, range.start), range.end) - range.start) / 60_000) *
		PX_PER_MINUTE;
	const hours: number[] = [];
	for (let hour = range.start; hour <= range.end; hour += HOUR_MS) {
		hours.push(hour);
	}

	return (
		<div className="space-y-3">
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
			<div className="overflow-x-auto rounded-lg border border-line bg-surface">
				<div
					className="grid min-w-full"
					style={{
						gridTemplateColumns: `3.5rem repeat(${rooms.length}, minmax(11rem, 1fr))`,
					}}
				>
					{/* 部屋の見出し */}
					<div className="sticky top-0 z-10 border-b border-line bg-board-head" />
					{rooms.map((room) => (
						<div
							key={room}
							className="sticky top-0 z-10 flex items-center gap-2 border-b border-l border-board-head-ink/20 bg-board-head px-3 py-2 text-sm font-bold text-board-head-ink"
						>
							<span
								aria-hidden
								className="size-2.5 shrink-0 rounded-full"
								style={{ backgroundColor: roomColor(allRooms.indexOf(room)) }}
							/>
							<span className="truncate">{room}</span>
						</div>
					))}

					{/* 時刻の目盛り */}
					<div className="relative" style={{ height }}>
						{hours.map((hour, index) => (
							<span
								key={hour}
								// 上端の文字は下に、下端の文字は上にずらして、枠からはみ出さないようにする
								className={`absolute right-2 text-[11px] font-bold text-ink-muted tabular ${index === 0 ? "" : hour >= range.end ? "-translate-y-full" : "-translate-y-1/2"}`}
								style={{ top: toY(hour) }}
							>
								{formatTime(hour)}
							</span>
						))}
					</div>

					{/* 部屋ごとの列 */}
					{rooms.map((room) => {
						const items = daySessions
							.filter((session) => session.room === room)
							.sort((a, b) => toMs(a.start) - toMs(b.start));
						const lanes = assignLanes(
							items.map((item) => ({
								start: toMs(item.start),
								end: toMs(item.end),
							})),
						);
						const laneCount = Math.max(1, ...lanes.map((lane) => lane + 1));
						const color = roomColor(allRooms.indexOf(room));
						return (
							<ul
								key={room}
								aria-label={t("timetable.overlayRoom", { room })}
								className="relative border-l border-line"
								style={{ height }}
							>
								{hours.map((hour) => (
									<li
										key={hour}
										aria-hidden
										className="absolute inset-x-0 border-t border-line"
										style={{ top: toY(hour) }}
									/>
								))}
								{items.map((item, index) => {
									const top = toY(toMs(item.start));
									const blockHeight = Math.max(toY(toMs(item.end)) - top, 18);
									const accent = item.trackColor ?? color;
									const time = `${formatTime(toMs(item.start))}–${formatTime(toMs(item.end))}`;
									return (
										<li
											key={item.id}
											title={`${time} ${item.title}（${item.speaker}）`}
											className="absolute overflow-hidden rounded-md border border-line-strong bg-surface px-2 py-1 text-xs leading-snug shadow-sm"
											style={{
												top: top + 1,
												height: blockHeight - 2,
												left: `calc(${(lanes[index]! / laneCount) * 100}% + 4px)`,
												width: `calc(${100 / laneCount}% - 8px)`,
												borderLeft: `4px solid ${accent}`,
												backgroundColor: `color-mix(in srgb, ${accent} 10%, var(--color-surface))`,
											}}
										>
											{blockHeight < 44 ? (
												// 短いセッションは 1 行にまとめる
												<p className="truncate">
													<span className="mr-1.5 text-[11px] text-ink-muted tabular">
														{time}
													</span>
													<span className="font-bold text-ink">
														{item.title}
													</span>
												</p>
											) : (
												<>
													<p className="text-[11px] text-ink-muted tabular">
														{time}
													</p>
													<p className="line-clamp-2 font-bold text-ink">
														{item.title}
													</p>
													<p className="truncate text-ink-muted">
														{item.speaker}
													</p>
												</>
											)}
										</li>
									);
								})}
							</ul>
						);
					})}
				</div>
			</div>
		</div>
	);
};

export default TimetableGrid;
