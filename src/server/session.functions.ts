import { createServerFn } from "@tanstack/react-start";
import { loginMethods } from "../lib/auth.server";
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
