// 団体の URL（/o/<slug>）と名前の決まり
import { z } from "zod";

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
	.min(3, "URL は 3 文字以上にしてください")
	.max(32, "URL は 32 文字までにしてください")
	.regex(
		/^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/,
		"URL は半角の英小文字・数字・ハイフンだけで、ハイフンで始めたり終えたりしないでください",
	)
	.refine((slug) => !RESERVED_SLUGS.has(slug), "この URL は使えません");

export const orgNameSchema = z
	.string()
	.trim()
	.min(1, "団体名を入力してください")
	.max(80, "団体名は 80 文字までにしてください");
