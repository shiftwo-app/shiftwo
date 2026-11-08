// 言語の Cookie を書く（サーバー専用）
import { setCookie } from "@tanstack/react-start/server";
import { LOCALE_COOKIE, type Locale } from "../lib/i18n/locales";

const COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

/** このブラウザの言語を Cookie に覚える（1 年） */
export const rememberLocale = (locale: Locale) =>
	setCookie(LOCALE_COOKIE, locale, {
		path: "/",
		maxAge: COOKIE_MAX_AGE,
		sameSite: "lax",
		httpOnly: false,
	});
