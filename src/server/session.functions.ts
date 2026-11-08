import { createServerFn } from "@tanstack/react-start";
import { getCookie, setCookie } from "@tanstack/react-start/server";
import { z } from "zod";
import { loginMethods } from "../lib/auth.server";
import {
	isLoginRequestedHere,
	LOGIN_REQUEST_COOKIE,
	LOGIN_REQUEST_MAX_AGE_SECONDS,
	normalizeEmail,
} from "../lib/login-request";
import { prisma } from "../lib/prisma.server";
import { nameSchema } from "../lib/profile";
import { requireUserMiddleware } from "./auth-middleware";
import { getCurrentUser } from "./session.server";

/** ログインしている人（していなければ null）。画面の beforeLoad から呼ぶ */
export const getSession = createServerFn({ method: "GET" }).handler(() =>
	getCurrentUser(),
);

/** ログイン画面に出す方法（Discord が設定されているか） */
export const getLoginMethods = createServerFn({ method: "GET" }).handler(
	() => loginMethods,
);

/** はじめての設定を済ませる（名前を決める）。済ませた日時はサーバーが入れる */
export const completeOnboarding = createServerFn({ method: "POST" })
	.middleware([requireUserMiddleware])
	.validator((data: { name: unknown }) => data)
	.handler(async ({ data, context }) => {
		const parsed = nameSchema.safeParse(data.name);
		if (!parsed.success) {
			return {
				ok: false as const,
				errors: parsed.error.issues.map((issue) => issue.message),
			};
		}
		await prisma.user.update({
			where: { id: context.user.id },
			data: { name: parsed.data, onboardedAt: new Date() },
		});
		return { ok: true as const };
	});

const emailSchema = z.email();

/**
 * ログイン用のメールを送る直前に呼ぶ。このブラウザでそのアドレスにメールを送ったことを Cookie に残す
 * （メールのリンクを押すだけでログインできるのは、このブラウザだけにする。ログイン CSRF 対策）
 */
export const markLoginRequested = createServerFn({ method: "POST" })
	.validator((data: { email: unknown }) => ({
		email: emailSchema.parse(data.email),
	}))
	.handler(({ data }) => {
		setCookie(LOGIN_REQUEST_COOKIE, normalizeEmail(data.email), {
			httpOnly: true,
			sameSite: "lax",
			secure: process.env.BETTER_AUTH_URL?.startsWith("https://") ?? false,
			path: "/",
			maxAge: LOGIN_REQUEST_MAX_AGE_SECONDS,
		});
		return { ok: true as const };
	});

/** メールのリンクの先で、このブラウザがそのアドレスにメールを送ったかを調べる */
export const wasLoginRequestedHere = createServerFn({ method: "GET" })
	.validator((data: { email: unknown }) => ({
		email: typeof data.email === "string" ? data.email : "",
	}))
	.handler(({ data }) =>
		isLoginRequestedHere(getCookie(LOGIN_REQUEST_COOKIE), data.email),
	);
