// 人ごとの言語：メールは受け取る人が選んだ言語、なければそのとき使っている言語で送る。
// DATABASE_URL がない環境では飛ばす
import { afterAll, beforeAll, describe, expect, it } from "vite-plus/test";
import { translatorFor } from "../lib/i18n/translate";
import { buildLoginEmail } from "../lib/mail/login-email";
import { loadEnvFileIfExists } from "../lib/load-env";

loadEnvFileIfExists();
const hasDatabase = Boolean(process.env.DATABASE_URL);

describe.skipIf(!hasDatabase)("人ごとの言語（DB）", async () => {
	const { prisma } = await import("../lib/prisma.server");
	const { localeForEmail, localeForUser } =
		await import("./user-locale.server");
	const suffix = crypto.randomUUID().slice(0, 8);
	const ids: string[] = [];
	const createUser = async (label: string, locale: string | null) => {
		const user = await prisma.user.create({
			data: {
				id: crypto.randomUUID(),
				email: `${label}-${suffix}@example.com`,
				name: label,
				emailVerified: true,
				locale,
			},
		});
		ids.push(user.id);
		return user;
	};
	let korean: { id: string; email: string };
	let unset: { id: string; email: string };

	beforeAll(async () => {
		korean = await createUser("ul-ko", "ko");
		unset = await createUser("ul-unset", null);
	});
	afterAll(async () => {
		await prisma.user.deleteMany({ where: { id: { in: ids } } });
	});

	it("選んだ言語があればそれ、なければ・アカウントがなければ、そのとき使っている言語", async () => {
		expect(await localeForEmail(korean.email, "en")).toBe("ko");
		expect(await localeForEmail(korean.email.toUpperCase(), "en")).toBe("ko");
		expect(await localeForEmail(unset.email, "en")).toBe("en");
		expect(
			await localeForEmail(`nobody-${suffix}@example.com`, "zh-Hant"),
		).toBe("zh-Hant");
		expect(await localeForUser(korean.id, "ja")).toBe("ko");
		expect(await localeForUser(unset.id, "ja")).toBe("ja");
	});

	it("ログインのメールは、その言語の文面になる", async () => {
		const locale = await localeForEmail(korean.email, "ja");
		const mail = buildLoginEmail({
			email: korean.email,
			otp: "123456",
			link: "https://shiftwo.example/login/verify?x",
			t: translatorFor(locale),
		});
		expect(mail.subject).not.toMatch(/[぀-ヿ]/);
		expect(mail.subject).toMatch(/[가-힯]/);
	});
});
