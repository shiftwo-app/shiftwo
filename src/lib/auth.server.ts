// ログイン（Better Auth）。Discord とメール（確認コード＋リンク）
import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { emailOTP } from "better-auth/plugins";
import { tanstackStartCookies } from "better-auth/tanstack-start";
import { resolveDiscordConfig } from "./auth-config";
import { parseDatabaseProvider } from "./database-provider";
import {
	buildLoginEmail,
	buildLoginLink,
	LOGIN_CODE_EXPIRES_MINUTES,
} from "./mail/login-email";
import { sendMail } from "./mail/mailer.server";
import { prisma } from "./prisma.server";

const baseURL = process.env.BETTER_AUTH_URL;
const discord = resolveDiscordConfig(process.env);

export const auth = betterAuth({
	baseURL,
	// 本番では BETTER_AUTH_SECRET が必須（Better Auth が既定の値のままだと拒む）
	secret: process.env.BETTER_AUTH_SECRET,
	database: prismaAdapter(prisma, {
		provider: parseDatabaseProvider(process.env.DATABASE_PROVIDER),
	}),
	user: {
		additionalFields: {
			// はじめての設定（/welcome）を済ませた日時。クライアントからは書けない（input: false）
			onboardedAt: { type: "date", required: false, input: false },
		},
	},
	socialProviders: discord
		? {
				discord: {
					clientId: discord.clientId,
					clientSecret: discord.clientSecret,
				},
			}
		: {},
	plugins: [
		emailOTP({
			otpLength: 6,
			expiresIn: LOGIN_CODE_EXPIRES_MINUTES * 60,
			allowedAttempts: 5,
			async sendVerificationOTP({ email, otp, type }) {
				if (type !== "sign-in") return; // 今はログインだけに使う
				const link = buildLoginLink(
					baseURL ?? "http://localhost:3000",
					email,
					otp,
				);
				// 送るのを待つと、届く宛先かどうかが応答時間でわかってしまうので待たない
				// （Workers では waitUntil に載せる。Cloudflare 向けの build で対応する）
				void sendMail(buildLoginEmail({ email, otp, link })).catch((error) =>
					console.error("ログインのメールを送れませんでした", error),
				);
			},
		}),
		// TanStack Start の server function からも Cookie を書けるようにする。必ず最後に置く
		tanstackStartCookies(),
	],
});

export const loginMethods = {
	email: true as const,
	discord: discord !== undefined,
};
