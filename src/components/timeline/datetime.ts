// フォームの <input type="datetime-local"> と時刻（ms）の変換。
// datetime-local はタイムゾーンを持たないので、表示と同じ Asia/Tokyo（UTC+9）として読み書きする
import { DISPLAY_TIME_ZONE } from "./layout";

const DISPLAY_OFFSET = "+09:00";

const partsFormatter = new Intl.DateTimeFormat("en-CA", {
	timeZone: DISPLAY_TIME_ZONE,
	year: "numeric",
	month: "2-digit",
	day: "2-digit",
	hour: "2-digit",
	minute: "2-digit",
	hourCycle: "h23",
});

/** 時刻を datetime-local の値（YYYY-MM-DDTHH:mm、日本時間）にする */
export const toDateTimeInputValue = (ms: number): string => {
	const parts = Object.fromEntries(
		partsFormatter.formatToParts(ms).map((part) => [part.type, part.value]),
	);
	return `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}`;
};

/** datetime-local の値を、日本時間として ISO 形式（+09:00 付き）にする。空や不正なら undefined */
export const fromDateTimeInputValue = (value: string): string | undefined =>
	/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value)
		? `${value}:00${DISPLAY_OFFSET}`
		: undefined;
