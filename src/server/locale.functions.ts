import { createServerFn } from "@tanstack/react-start";
import { deleteCookie } from "@tanstack/react-start/server";
import { z } from "zod";
import { LOCALE_COOKIE, LOCALES } from "../lib/i18n/locales";
import { prisma } from "../lib/prisma.server";
import { rememberLocale } from "./locale-cookie.server";
import { getCurrentUser } from "./session.server";

/**
 * 画面の言語を選ぶ。ログインしていなくても選べる（Cookie に覚える）。
 * ログインしていれば、アカウントにも保存する（メールもその言語で届くようになる）。
 * null は「ブラウザに合わせる」（アカウントの設定を消し、Cookie も消す）
 */
export const setLocaleFn = createServerFn({ method: "POST" })
	.validator((data: { locale: unknown }) => ({
		locale: z.enum(LOCALES).nullable().parse(data.locale),
	}))
	.handler(async ({ data }) => {
		if (data.locale) rememberLocale(data.locale);
		else deleteCookie(LOCALE_COOKIE, { path: "/" });
		const user = await getCurrentUser();
		if (user) {
			await prisma.user.update({
				where: { id: user.id },
				data: { locale: data.locale },
			});
		}
		return { ok: true as const };
	});
