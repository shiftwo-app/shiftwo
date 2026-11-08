import { useMemo } from "react";
import { useIntlLocale, useT } from "../../lib/i18n/react";
import { roomColor, roomsOf } from "../../lib/timetable";
import {
	formatDayIn,
	formatTime,
	startOfDisplayDay,
	toMs,
} from "../timeline/layout";
import type { Session } from "./session";

/**
 * 希望を出すときの参考のタイムテーブル（FR-6-F）。日ごとに、時刻順の短い一覧にする。
 * 場所をとらないよう、最初は閉じておく
 */
const SessionReference = ({ sessions }: { sessions: Session[] }) => {
	const t = useT();
	const intlLocale = useIntlLocale();
	const rooms = useMemo(() => roomsOf(sessions), [sessions]);
	const byDay = useMemo(() => {
		const groups = new Map<number, Session[]>();
		for (const session of sessions) {
			const day = startOfDisplayDay(toMs(session.start));
			groups.set(day, [...(groups.get(day) ?? []), session]);
		}
		return [...groups.entries()].sort(([a], [b]) => a - b);
	}, [sessions]);

	return (
		<details className="group rounded-lg border border-line bg-surface">
			<summary className="cursor-pointer list-none px-4 py-3 text-sm font-bold text-ink marker:hidden">
				<span className="mr-2 inline-block transition-transform group-open:rotate-90">
					›
				</span>
				{t("timetable.referenceTitle")}
				<span className="ml-2 text-xs font-normal text-ink-muted">
					{t("timetable.referenceDescription")}
				</span>
			</summary>
			<div className="max-h-96 space-y-4 overflow-y-auto border-t border-line px-4 py-3">
				{byDay.map(([day, items]) => (
					<section key={day} className="space-y-1">
						<h3 className="text-xs font-bold text-ink-muted tabular">
							{formatDayIn(day, intlLocale)}
						</h3>
						<ul className="divide-y divide-line text-sm">
							{items.map((session) => (
								<li key={session.id} className="flex gap-3 py-1.5">
									<span className="w-28 shrink-0 whitespace-nowrap text-ink-muted tabular">
										{formatTime(toMs(session.start))}–
										{formatTime(toMs(session.end))}
									</span>
									<span className="flex w-28 shrink-0 items-center gap-1.5 truncate text-ink-muted">
										<span
											aria-hidden
											className="size-2 shrink-0 rounded-full"
											style={{
												backgroundColor:
													session.trackColor ??
													roomColor(rooms.indexOf(session.room)),
											}}
										/>
										<span className="truncate">{session.room}</span>
									</span>
									<span className="min-w-0">
										<span className="font-bold text-ink">{session.title}</span>
										<span className="ml-2 text-ink-muted">
											{session.speaker}
										</span>
									</span>
								</li>
							))}
						</ul>
					</section>
				))}
			</div>
		</details>
	);
};

export default SessionReference;
