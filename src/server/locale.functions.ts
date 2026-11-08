import { createServerFn } from "@tanstack/react-start";
import { setCookie } from "@tanstack/react-start/server";
import { z } from "zod";
import { LOCALE_COOKIE, LOCALES } from "../lib/i18n/locales";

/** 画面の言語を選ぶ（Cookie に 1 年覚えておく）。ログインしていなくても選べる */
export const setLocaleFn = createServerFn({ method: "POST" })
	.validator((data: { locale: unknown }) => ({
		locale: z.enum(LOCALES).parse(data.locale),
	}))
	.handler(({ data }) => {
		setCookie(LOCALE_COOKIE, data.locale, {
			path: "/",
			maxAge: 60 * 60 * 24 * 365,
			sameSite: "lax",
			httpOnly: false,
		});
		return { ok: true as const };
	});
