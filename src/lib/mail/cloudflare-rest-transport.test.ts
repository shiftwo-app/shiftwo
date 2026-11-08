import { describe, expect, it } from "vite-plus/test";
import {
	createCloudflareRestTransport,
	readCloudflareRestSettings,
} from "./cloudflare-rest-transport.server";

const env = {
	CLOUDFLARE_ACCOUNT_ID: "acc123",
	CLOUDFLARE_EMAIL_API_TOKEN: "token-xyz",
	MAIL_FROM: "noreply@example.com",
	MAIL_FROM_NAME: "shiftwo",
};
const mail = {
	to: "a@example.com",
	subject: "件名",
	text: "本文",
	html: "<p>本文</p>",
};

const respond = (status: number, body: unknown) => {
	const calls: { url: string; init: RequestInit }[] = [];
	const fetchImpl = (async (url: string, init: RequestInit) => {
		calls.push({ url, init });
		return new Response(JSON.stringify(body), { status });
	}) as unknown as typeof fetch;
	return { calls, fetchImpl };
};

describe("Cloudflare Email Service（REST API）", () => {
	it("アカウントの送信 API に、トークンを付けて送る", async () => {
		const { calls, fetchImpl } = respond(200, {
			success: true,
			result: { delivered: ["a@example.com"], permanent_bounces: [] },
		});
		await createCloudflareRestTransport(env, fetchImpl).send(mail);
		expect(calls).toHaveLength(1);
		expect(calls[0].url).toBe(
			"https://api.cloudflare.com/client/v4/accounts/acc123/email/sending/send",
		);
		expect(
			(calls[0].init.headers as Record<string, string>).authorization,
		).toBe("Bearer token-xyz");
		expect(JSON.parse(calls[0].init.body as string)).toEqual({
			from: { name: "shiftwo", email: "noreply@example.com" },
			...mail,
		});
	});

	it("失敗の応答は、Cloudflare のエラーを添えて投げる", async () => {
		const { fetchImpl } = respond(403, {
			success: false,
			errors: [
				{
					code: 10102,
					message: "email.sending.error.authentication.forbidden",
				},
			],
		});
		await expect(
			createCloudflareRestTransport(env, fetchImpl).send(mail),
		).rejects.toThrow(/10102/);
	});

	it("宛先が permanent bounce なら投げる", async () => {
		const { fetchImpl } = respond(200, {
			success: true,
			result: { delivered: [], permanent_bounces: ["a@example.com"] },
		});
		await expect(
			createCloudflareRestTransport(env, fetchImpl).send(mail),
		).rejects.toThrow(/permanent bounce/);
	});

	it("足りない設定は、名前を挙げて断る", () => {
		expect(() =>
			readCloudflareRestSettings({ MAIL_FROM: "x@example.com" }),
		).toThrow(/CLOUDFLARE_ACCOUNT_ID・CLOUDFLARE_EMAIL_API_TOKEN/);
	});
});
