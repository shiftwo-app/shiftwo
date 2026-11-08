import { describe, expect, it } from "vite-plus/test";
import { buildLoginEmail, buildLoginLink } from "./login-email";
import { resolveMailTransport } from "./mailer.server";

describe("ログインのメール", () => {
	it("リンクにメールアドレスと確認コードを入れる（記号はエンコードする）", () => {
		const link = buildLoginLink(
			"https://shiftwo.example",
			"a+b@example.com",
			"123456",
		);
		const url = new URL(link);
		expect(url.pathname).toBe("/login/verify");
		expect(url.searchParams.get("email")).toBe("a+b@example.com");
		expect(url.searchParams.get("otp")).toBe("123456");
	});

	it("1 通に確認コードとリンクの両方を入れる", () => {
		const mail = buildLoginEmail({
			email: "a@example.com",
			otp: "123456",
			link: "https://shiftwo.example/login/verify?x",
		});
		expect(mail.to).toBe("a@example.com");
		expect(mail.subject).toContain("123456");
		expect(mail.text).toContain("123456");
		expect(mail.text).toContain("https://shiftwo.example/login/verify?x");
	});
});

describe("resolveMailTransport", () => {
	it("開発中は未設定なら console", () => {
		expect(resolveMailTransport(undefined, "development")).toBe("console");
	});

	it("本番で未設定ならエラー（送れないまま動かさない）", () => {
		expect(() => resolveMailTransport(undefined, "production")).toThrow(
			/MAIL_TRANSPORT/,
		);
	});

	it("知らない値はエラー", () => {
		expect(() => resolveMailTransport("smtp", "development")).toThrow(
			/MAIL_TRANSPORT/,
		);
	});
});
