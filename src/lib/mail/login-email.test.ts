import { describe, expect, it } from "vite-plus/test";
import { translatorFor } from "../i18n/translate";
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

	it("既定は日本語の文面", () => {
		const mail = buildLoginEmail({
			email: "a@example.com",
			otp: "123456",
			link: "https://shiftwo.example/login/verify?x",
		});
		expect(mail.subject).toBe("シフトヲのログイン（確認コード 123456）");
		expect(mail.text).toContain("どちらも 10 分で使えなくなります。");
	});

	it("渡した言語の文面にする", () => {
		const mail = buildLoginEmail({
			email: "a@example.com",
			otp: "123456",
			link: "https://shiftwo.example/login/verify?x",
			t: translatorFor("en"),
		});
		expect(mail.subject).toContain("123456");
		expect(mail.subject).not.toContain("ログイン");
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

	it("smtp と cloudflare は受け付ける", () => {
		expect(resolveMailTransport("smtp", "production")).toBe("smtp");
		expect(resolveMailTransport("cloudflare", "production")).toBe("cloudflare");
	});

	it("知らない値はエラー", () => {
		expect(() => resolveMailTransport("sendgrid", "development")).toThrow(
			/MAIL_TRANSPORT/,
		);
	});
});
