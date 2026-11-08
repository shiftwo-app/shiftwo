// Cloudflare Email Service の REST API で送る（MAIL_TRANSPORT=cloudflare を Node：セルフホストで使うとき）。
// Workers では REST ではなく binding（wrangler.jsonc の send_email）で送る（src/platform/cloudflare.server.ts）。
//
//   CLOUDFLARE_ACCOUNT_ID       … Cloudflare のアカウント ID
//   CLOUDFLARE_EMAIL_API_TOKEN  … 「Email Sending: Edit」の権限を持つ API トークン
//   MAIL_FROM（と MAIL_FROM_NAME） … Email Sending に登録したドメインの、送り主のアドレス
import type { MailTransport } from "./mailer.server";

export type CloudflareRestSettings = {
	accountId: string;
	apiToken: string;
	from: string | { name: string; email: string };
};

export const readCloudflareRestSettings = (
	env: Record<string, string | undefined>,
): CloudflareRestSettings => {
	const missing = [
		"CLOUDFLARE_ACCOUNT_ID",
		"CLOUDFLARE_EMAIL_API_TOKEN",
		"MAIL_FROM",
	].filter((name) => !env[name]);
	if (missing.length > 0) {
		throw new Error(
			`MAIL_TRANSPORT=cloudflare（Workers の外）には ${missing.join("・")} が要ります`,
		);
	}
	const email = env.MAIL_FROM as string;
	return {
		accountId: env.CLOUDFLARE_ACCOUNT_ID as string,
		apiToken: env.CLOUDFLARE_EMAIL_API_TOKEN as string,
		from: env.MAIL_FROM_NAME ? { name: env.MAIL_FROM_NAME, email } : email,
	};
};

type SendResponse = {
	success?: boolean;
	errors?: { code?: number; message?: string }[];
	result?: { permanent_bounces?: string[] };
};

export const createCloudflareRestTransport = (
	env: Record<string, string | undefined>,
	fetchImpl: typeof fetch = fetch,
): MailTransport => ({
	async send(mail) {
		const settings = readCloudflareRestSettings(env);
		const response = await fetchImpl(
			`https://api.cloudflare.com/client/v4/accounts/${encodeURIComponent(settings.accountId)}/email/sending/send`,
			{
				method: "POST",
				headers: {
					authorization: `Bearer ${settings.apiToken}`,
					"content-type": "application/json",
				},
				body: JSON.stringify({
					from: settings.from,
					to: mail.to,
					subject: mail.subject,
					text: mail.text,
					html: mail.html,
				}),
			},
		);
		const body = (await response.json().catch(() => ({}))) as SendResponse;
		if (!response.ok || body.success === false) {
			const detail =
				body.errors
					?.map((e) => `${e.code ?? ""} ${e.message ?? ""}`.trim())
					.join(", ") || `HTTP ${response.status}`;
			throw new Error(`Cloudflare Email Service で送れませんでした: ${detail}`);
		}
		if (body.result?.permanent_bounces?.length) {
			throw new Error(
				`Cloudflare Email Service が宛先を受け付けませんでした（permanent bounce）: ${body.result.permanent_bounces.join(", ")}`,
			);
		}
	},
});
