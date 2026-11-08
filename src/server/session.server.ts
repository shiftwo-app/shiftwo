// ログインしている人を調べる（サーバー専用）
import { getRequestHeaders } from "@tanstack/react-start/server";
import { auth } from "../lib/auth.server";
import type { Locale } from "../lib/i18n/locales";
import { parseUserLocale } from "./user-locale.server";

/** 画面やクライアントに渡してよい、ログインしている人の情報 */
export type SessionUser = {
	id: string;
	name: string;
	email: string;
	image: string | null;
	/** はじめての設定（/welcome）を済ませたか */
	onboarded: boolean;
	/** 本人が選んだ言語（選んでいなければ null） */
	locale: Locale | null;
};

const toSessionUser = (user: {
	id: string;
	name: string;
	email: string;
	image?: string | null;
	onboardedAt?: Date | null;
	locale?: string | null;
}): SessionUser => ({
	id: user.id,
	name: user.name,
	email: user.email,
	image: user.image ?? null,
	onboarded: user.onboardedAt != null,
	locale: parseUserLocale(user.locale),
});

/** リクエストの Cookie から、ログインしている人を返す。ログインしていなければ null */
export const getSessionUserFromHeaders = async (
	headers: Headers,
): Promise<SessionUser | null> => {
	const session = await auth.api.getSession({ headers });
	return session ? toSessionUser(session.user) : null;
};

/** server function の中から、ログインしている人を返す */
export const getCurrentUser = () =>
	getSessionUserFromHeaders(getRequestHeaders());

/**
 * server route（API）の handler を包み、ログインしていなければ 401 を返す。
 * していれば、handler に user を渡して呼ぶ
 */
export const withUser =
	<Ctx extends { request: Request }>(
		handler: (ctx: Ctx & { user: SessionUser }) => Response | Promise<Response>,
	) =>
	async (ctx: Ctx): Promise<Response> => {
		const user = await getSessionUserFromHeaders(ctx.request.headers);
		if (!user) {
			return Response.json({ message: "Unauthorized" }, { status: 401 });
		}
		return handler({ ...ctx, user });
	};
