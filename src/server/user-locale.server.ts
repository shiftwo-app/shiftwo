// 人ごとの言語。メールは受け取る人の言語で送る（本人が選んだ言語、なければ、そのとき使っている言語）
import { isLocale, type Locale } from "../lib/i18n/locales";
import { prisma } from "../lib/prisma.server";

/** アカウントに保存した言語（選んでいなければ null） */
export const parseUserLocale = (
	value: string | null | undefined,
): Locale | null => (isLocale(value) ? value : null);

/**
 * メールアドレスの持ち主に送るメールの言語。アカウントがあって言語を選んでいればその言語、
 * なければ fallback（ログインのメールを頼んだリクエストの言語など）
 */
export const localeForEmail = async (
	email: string,
	fallback: Locale,
): Promise<Locale> => {
	const user = await prisma.user.findUnique({
		where: { email: email.trim().toLowerCase() },
		select: { locale: true },
	});
	return parseUserLocale(user?.locale) ?? fallback;
};

/** その人に送るメールの言語 */
export const localeForUser = async (
	userId: string,
	fallback: Locale,
): Promise<Locale> => {
	const user = await prisma.user.findUnique({
		where: { id: userId },
		select: { locale: true },
	});
	return parseUserLocale(user?.locale) ?? fallback;
};
