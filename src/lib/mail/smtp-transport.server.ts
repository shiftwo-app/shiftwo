// SMTP で送る（MAIL_TRANSPORT=smtp。Node：セルフホスト）。
// 接続先は SMTP_URL（例：smtp://user:pass@smtp.example.com:587、465 番なら smtps://...）。
// 送り主は MAIL_FROM（と、あれば MAIL_FROM_NAME）
import type { Transporter } from "nodemailer";
import type { MailTransport } from "./mailer.server";

export type SmtpSettings = {
	url: string;
	from: string | { name: string; address: string };
};

/** 環境変数から SMTP の設定を読む。足りなければ、何が足りないかを書いたエラー */
export const readSmtpSettings = (
	env: Record<string, string | undefined>,
): SmtpSettings => {
	const missing = ["SMTP_URL", "MAIL_FROM"].filter((name) => !env[name]);
	if (missing.length > 0) {
		throw new Error(
			`MAIL_TRANSPORT=smtp には ${missing.join(" と ")} が要ります`,
		);
	}
	const url = env.SMTP_URL as string;
	if (!/^smtps?:\/\//.test(url)) {
		throw new Error(
			"SMTP_URL は smtp:// か smtps:// で始めてください（例：smtp://user:pass@smtp.example.com:587）",
		);
	}
	const address = env.MAIL_FROM as string;
	return {
		url,
		from: env.MAIL_FROM_NAME ? { name: env.MAIL_FROM_NAME, address } : address,
	};
};

export const createSmtpTransport = (
	env: Record<string, string | undefined>,
): MailTransport => {
	// 接続は使い回す。nodemailer は使うとき（はじめて送るとき）に読み込む
	let transporter:
		| Promise<{ transporter: Transporter; settings: SmtpSettings }>
		| undefined;
	return {
		async send(mail) {
			transporter ??= (async () => {
				const settings = readSmtpSettings(env);
				const { createTransport } = await import("nodemailer");
				return { transporter: createTransport(settings.url), settings };
			})();
			const { transporter: smtp, settings } = await transporter.catch(
				(error: unknown) => {
					transporter = undefined; // 設定を直したら、次は作り直す
					throw error;
				},
			);
			await smtp.sendMail({
				from: settings.from,
				to: mail.to,
				subject: mail.subject,
				text: mail.text,
				html: mail.html,
			});
		},
	};
};
