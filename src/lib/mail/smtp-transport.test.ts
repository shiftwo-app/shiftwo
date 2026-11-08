import { describe, expect, it } from "vite-plus/test";
import { readSmtpSettings } from "./smtp-transport.server";

describe("readSmtpSettings", () => {
	it("SMTP_URL と MAIL_FROM を読む。MAIL_FROM_NAME があれば名前を付ける", () => {
		expect(
			readSmtpSettings({
				SMTP_URL: "smtp://u:p@mail.example.com:587",
				MAIL_FROM: "noreply@example.com",
			}),
		).toEqual({
			url: "smtp://u:p@mail.example.com:587",
			from: "noreply@example.com",
		});
		expect(
			readSmtpSettings({
				SMTP_URL: "smtps://mail.example.com",
				MAIL_FROM: "noreply@example.com",
				MAIL_FROM_NAME: "shiftwo",
			}).from,
		).toEqual({ name: "shiftwo", address: "noreply@example.com" });
	});

	it("足りない設定は、名前を挙げて断る", () => {
		expect(() => readSmtpSettings({})).toThrow(/SMTP_URL と MAIL_FROM/);
		expect(() =>
			readSmtpSettings({ SMTP_URL: "smtp://mail.example.com" }),
		).toThrow(/MAIL_FROM/);
	});

	it("smtp:// でも smtps:// でもない URL は断る", () => {
		expect(() =>
			readSmtpSettings({
				SMTP_URL: "http://mail.example.com",
				MAIL_FROM: "noreply@example.com",
			}),
		).toThrow(/smtp:\/\//);
	});
});
