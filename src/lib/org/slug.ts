// 団体の URL（/o/<slug>）と名前の決まり
import { z } from "zod";
import { getCurrentLocale } from "../i18n/current-locale";
import type { MessageKey } from "../i18n/messages";
import { translate } from "../i18n/translate";

/** エラーの文は、確かめるときの言語にする（サーバーではリクエストの言語、画面では画面の言語） */
const localized = (key: MessageKey) => ({
	error: () => translate(getCurrentLocale(), key),
});

/** URL として使えない（ほかの画面と紛らわしい）名前 */
export const RESERVED_SLUGS = new Set([
	"new",
	"join",
	"settings",
	"admin",
	"api",
	"login",
	"signup",
	"welcome",
	"help",
	"o",
	"orgs",
	"legacy",
	// テナント・イベントの画面の URL と紛らわしいもの
	"t",
	"e",
	"draft",
	"events",
]);

export const slugSchema = z
	.string()
	.trim()
	.toLowerCase()
	.min(3, localized("orgs.slugTooShort"))
	.max(32, localized("orgs.slugTooLong"))
	.regex(/^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/, localized("orgs.slugInvalid"))
	.refine((slug) => !RESERVED_SLUGS.has(slug), localized("orgs.slugReserved"));

export const orgNameSchema = z
	.string()
	.trim()
	.min(1, localized("orgs.nameRequired"))
	.max(80, localized("orgs.nameTooLong"));
