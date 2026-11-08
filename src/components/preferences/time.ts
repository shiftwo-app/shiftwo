// 希望の休憩の入力（日付＋時刻のプルダウン）と時刻（ms）の変換。表示と同じ日本時間として扱う
import { toDateTimeInputValue } from "../timeline/datetime";

const DAY_MINUTES = 24 * 60;

/** 時刻を、日本時間の日付（YYYY-MM-DD）と、その日の 0 時からの分にする */
export const splitJst = (ms: number): { date: string; minutes: number } => {
	const [date, time] = toDateTimeInputValue(ms).split("T");
	const [hour, minute] = time.split(":").map(Number);
	return { date, minutes: hour * 60 + minute };
};

/** 日本時間の日付と、その日の 0 時からの分を時刻にする。24:00（1440 分）は次の日の 0 時 */
export const joinJst = (date: string, minutes: number): number =>
	Date.parse(`${date}T00:00:00+09:00`) + minutes * 60_000;

/** 時刻のプルダウンの選択肢（時間粒度ごと）。終わり用には 24:00 も含める */
export const timeOptions = (unitMinutes: number, includeEndOfDay: boolean) => {
	const options: { value: number; label: string }[] = [];
	const last = includeEndOfDay ? DAY_MINUTES : DAY_MINUTES - unitMinutes;
	for (let minutes = 0; minutes <= last; minutes += unitMinutes) {
		const h = String(Math.floor(minutes / 60)).padStart(2, "0");
		const m = String(minutes % 60).padStart(2, "0");
		options.push({ value: minutes, label: `${h}:${m}` });
	}
	return options;
};

const formatters = new Map<
	string,
	{ range: Intl.DateTimeFormat; time: Intl.DateTimeFormat }
>();
/** 言語ごとの書き方（日本時間）。作るのは言語ごとに 1 回 */
const formattersFor = (intlLocale: string) => {
	let found = formatters.get(intlLocale);
	if (!found) {
		found = {
			range: new Intl.DateTimeFormat(intlLocale, {
				timeZone: "Asia/Tokyo",
				month: "numeric",
				day: "numeric",
				hour: "2-digit",
				minute: "2-digit",
				hourCycle: "h23",
			}),
			time: new Intl.DateTimeFormat(intlLocale, {
				timeZone: "Asia/Tokyo",
				hour: "2-digit",
				minute: "2-digit",
				hourCycle: "h23",
			}),
		};
		formatters.set(intlLocale, found);
	}
	return found;
};

/** 範囲の「〜」。日本語・中国語は「〜」、ほかは「–」 */
const rangeSeparator = (intlLocale: string) =>
	/^(ja|zh)\b/.test(intlLocale) ? "〜" : "–";

/**
 * 「11/20 12:00〜13:00」のような表示（日をまたぐときは終わりにも日付を付ける）。
 * intlLocale は Intl のロケール（useIntlLocale() のもの）。省けば日本語
 */
export const formatRange = (
	range: { start: number; end: number },
	intlLocale = "ja-JP",
): string => {
	const { range: rangeFormatter, time: timeFormatter } =
		formattersFor(intlLocale);
	const sameDay = splitJst(range.start).date === splitJst(range.end - 1).date;
	const endsAtMidnight = splitJst(range.end).minutes === 0;
	const end = !sameDay
		? rangeFormatter.format(range.end)
		: endsAtMidnight
			? "24:00"
			: timeFormatter.format(range.end);
	return `${rangeFormatter.format(range.start)}${rangeSeparator(intlLocale)}${end}`;
};
