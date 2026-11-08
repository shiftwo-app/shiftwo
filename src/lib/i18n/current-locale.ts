// いまの言語。サーバーではリクエストの言語、画面ではサーバーが描いた <html lang> を読む
// （サーバーと画面で同じ値になり、ハイドレーションでずれない）
import { createIsomorphicFn } from "@tanstack/react-start";
import { DEFAULT_LOCALE, isLocale, type Locale } from "./locales";
import { getRequestLocale } from "./request-locale.server";

export const getCurrentLocale = createIsomorphicFn()
	.server((): Locale => getRequestLocale())
	.client((): Locale => {
		const lang = document.documentElement.lang;
		return isLocale(lang) ? lang : DEFAULT_LOCALE;
	});
