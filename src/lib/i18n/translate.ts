// メッセージを引いて、{name} のような差し込みを埋める。画面とサーバーの両方で使う
import { DEFAULT_LOCALE, type Locale } from "./locales";
import { catalogs, type MessageKey } from "./messages";

export type MessageParams = Record<string, string | number>;

/** メッセージを引く関数。画面では useT()、サーバーでは serverT（request-locale.server.ts）を使う */
export type Translate = (key: MessageKey, params?: MessageParams) => string;

const interpolate = (template: string, params?: MessageParams) =>
	params
		? template.replace(/\{(\w+)\}/g, (match, name: string) =>
				name in params ? String(params[name]) : match,
			)
		: template;

/** その言語のメッセージ。万一なければ日本語、それもなければキーをそのまま出す（気づけるように） */
export const translate = (
	locale: Locale,
	key: MessageKey,
	params?: MessageParams,
): string => {
	const template =
		catalogs[locale][key] ?? catalogs[DEFAULT_LOCALE][key] ?? key;
	return interpolate(template, params);
};

export const translatorFor =
	(locale: Locale): Translate =>
	(key, params) =>
		translate(locale, key, params);
