// 画面の言語。日本語を既定にして、英語・中国語（簡体字・繁体字）・韓国語を用意する。
// 言語を足すときは、ここと messages/ の各名前空間に、その言語のファイルを足す

export const LOCALES = ["ja", "en", "zh-Hans", "zh-Hant", "ko"] as const;
export type Locale = (typeof LOCALES)[number];
export const DEFAULT_LOCALE: Locale = "ja";

/** 言語の切り替えに出す名前（その言語自身での書き方） */
export const LOCALE_NAMES: Record<Locale, string> = {
	ja: "日本語",
	en: "English",
	"zh-Hans": "简体中文",
	"zh-Hant": "繁體中文",
	ko: "한국어",
};

/** 日付・数の書き方に使う Intl のロケール（地域を決める） */
export const INTL_LOCALES: Record<Locale, string> = {
	ja: "ja-JP",
	en: "en-US",
	"zh-Hans": "zh-CN",
	"zh-Hant": "zh-TW",
	ko: "ko-KR",
};

export const isLocale = (value: unknown): value is Locale =>
	typeof value === "string" && (LOCALES as readonly string[]).includes(value);

/** 言語を選んだことを覚えておく Cookie の名前 */
export const LOCALE_COOKIE = "shiftwo-locale";

/**
 * ブラウザの言語（Accept-Language や navigator.languages の形の「ja,en-US;q=0.8」など）から、
 * 用意している言語を選ぶ。中国語は、繁体字の地域（台湾・香港・マカオ）と Hant の指定なら繁体字、それ以外は簡体字
 */
export const negotiateLocale = (header: string | null | undefined): Locale => {
	if (!header) return DEFAULT_LOCALE;
	const candidates = header
		.split(",")
		.map((part) => {
			const [tag, ...params] = part.trim().split(";");
			const q = params.find((p) => p.trim().startsWith("q="));
			return { tag: tag.toLowerCase(), q: q ? Number(q.split("=")[1]) : 1 };
		})
		.filter((c) => c.tag && !Number.isNaN(c.q) && c.q > 0)
		.sort((a, b) => b.q - a.q);
	for (const { tag } of candidates) {
		const [language, ...rest] = tag.split("-");
		if (language === "zh") {
			const traditional = rest.some((sub) =>
				["hant", "tw", "hk", "mo"].includes(sub),
			);
			return traditional ? "zh-Hant" : "zh-Hans";
		}
		if (language === "ja") return "ja";
		if (language === "en") return "en";
		if (language === "ko") return "ko";
	}
	return DEFAULT_LOCALE;
};

/** Cookie の文字列から、選んだ言語を読む */
export const localeFromCookie = (
	cookie: string | null | undefined,
): Locale | null => {
	if (!cookie) return null;
	for (const part of cookie.split(";")) {
		const [name, ...value] = part.trim().split("=");
		if (name === LOCALE_COOKIE) {
			const decoded = decodeURIComponent(value.join("="));
			return isLocale(decoded) ? decoded : null;
		}
	}
	return null;
};

/** リクエストの言語：Cookie で選んだ言語、なければブラウザの言語 */
export const localeOfRequest = (headers: Headers): Locale =>
	localeFromCookie(headers.get("cookie")) ??
	negotiateLocale(headers.get("accept-language"));
