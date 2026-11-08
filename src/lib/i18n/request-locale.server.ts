// サーバーでの、そのリクエストの言語。src/server.ts がリクエストのたびに決めて、リクエストごとの入れ物に置く。
// サーバーが返すメッセージ（エラー・メール）は serverT で、この言語にする
import { inRequestScope, requestScoped } from "../request-scope.server";
import { DEFAULT_LOCALE, type Locale } from "./locales";
import { type Translate, translate } from "./translate";

const LOCALE = Symbol("locale");

/** このリクエストの言語を決める（src/server.ts から、リクエストのはじめに 1 回） */
export const setRequestLocale = (locale: Locale): void => {
	requestScoped(LOCALE, () => locale);
};

/** このリクエストの言語。リクエストの外（テストなど）では既定の言語 */
export const getRequestLocale = (): Locale =>
	inRequestScope()
		? requestScoped(LOCALE, () => DEFAULT_LOCALE)
		: DEFAULT_LOCALE;

/** サーバーで、このリクエストの言語のメッセージを引く */
export const serverT: Translate = (key, params) =>
	translate(getRequestLocale(), key, params);
