// ログイン（Better Auth）。Discord とメール（確認コード＋リンク）
import { platform } from "#platform";
import { cimd } from "@better-auth/cimd";
import { mcp } from "@better-auth/mcp";
import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { emailOTP, jwt } from "better-auth/plugins";
import { tanstackStartCookies } from "better-auth/tanstack-start";
import { resolveDiscordConfig } from "./auth-config";
import { authDatabase } from "./auth-database.server";
import { parseDatabaseProvider } from "./database-provider";
import { getRequestLocale } from "./i18n/request-locale.server";
import { translatorFor } from "./i18n/translate";
import {
	buildLoginEmail,
	buildLoginLink,
	LOGIN_CODE_EXPIRES_MINUTES,
} from "./mail/login-email";
import { sendMail } from "./mail/mailer.server";
import { MCP_SCOPES, mcpResourceUrl } from "./mcp-config";
import { prisma } from "./prisma.server";

const baseURL = process.env.BETTER_AUTH_URL;
const databaseProvider = parseDatabaseProvider(process.env.DATABASE_PROVIDER);
const discord = resolveDiscordConfig(process.env);

export const auth = betterAuth({
	baseURL,
	// 本番では BETTER_AUTH_SECRET が必須（Better Auth が既定の値のままだと拒む）
	secret: process.env.BETTER_AUTH_SECRET,
	database: prismaAdapter(authDatabase(prisma, databaseProvider), {
		provider: databaseProvider,
	}),
	user: {
		additionalFields: {
			// はじめての設定（/welcome）を済ませた日時。クライアントからは書けない（input: false）
			onboardedAt: { type: "date", required: false, input: false },
			// 本人が選んだ言語（アカウントの設定で変える）。クライアントからは書けない
			locale: { type: "string", required: false, input: false },
		},
	},
	socialProviders: discord
		? {
				discord: {
					clientId: discord.clientId,
					clientSecret: discord.clientSecret,
					// Discord でメールアドレスを確認していなければ、ログインさせない（下の databaseHooks と二重の守り）
					requireEmailVerification: true,
					// サーバーの一覧（団体の参加の条件にするサーバーを選ぶ）と、サーバーでのプロフィール
					// （サーバーのメンバーかどうかと、サーバーでのアイコン）を読む
					scope: ["identify", "email", "guilds", "guilds.members.read"],
				},
			}
		: {},
	account: {
		accountLinking: {
			enabled: true,
			// メールで登録した人が、メールアドレスの違う Discord アカウントを連携できるようにする
			// （ログインした本人が自分で連携する操作だけ。メールアドレスによる自動の紐づけは、これまでどおり確認済みのときだけ）
			allowDifferentEmails: true,
		},
	},
	databaseHooks: {
		session: {
			create: {
				// ログインのたびに、団体の Discord サーバーの条件を確かめ直す（抜けた人は見られなくし、戻った人は戻す）。
				// 失敗してもログインは止めない
				after: async (session) => {
					try {
						const { refreshDiscordMemberships } =
							await import("../server/discord-membership.server");
						await refreshDiscordMemberships(session.userId);
					} catch (error) {
						console.error(
							"Discord サーバーの条件を確かめられませんでした",
							error,
						);
					}
				},
			},
		},
		user: {
			create: {
				// メールアドレスを確認できていないアカウントは作らない（アカウントの乗っ取りの下準備を防ぐ）。
				// 未確認の Discord で他人のアドレスを名乗って先に作っておき、あとから本人がメールで登録した
				// アカウントに紐づいたまま残る、という手口を塞ぐ。メールの確認コードでのログインは確認済み、
				// Discord は Discord で確認済みのときだけ通る。既存のアカウントへの自動の紐づけは、
				// Better Auth の既定で、確認済みのアドレスのときだけ行われる
				before: async (user) => (user.emailVerified ? undefined : false),
			},
		},
	},
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
				// 文面は、受け取る人が選んだ言語、なければログインのメールを頼んだリクエストの言語にする
				// （リクエストの言語は、送るのが応答のあとになるので先に決めておく）
				const requestLocale = getRequestLocale();
				// 送るのを待つと、届く宛先かどうかが応答時間でわかってしまうので待たない。
				// 受け取る人の言語を調べるのも、応答のあと（送る処理の中）で行う
				// （Workers では waitUntil に載せて、応答を返したあとも送り終えるまで続けさせる）
				platform.runInBackground(
					"ログインのメールを送れませんでした",
					async () => {
						const { localeForEmail } =
							await import("../server/user-locale.server");
						const t = translatorFor(await localeForEmail(email, requestLocale));
						await sendMail(buildLoginEmail({ email, otp, link, t }));
					},
				);
			},
		}),
		// MCP（AI のアシスタントからシフトヲを使う）。シフトヲが OAuth の認可サーバーになり、
		// アクセストークン（JWT。jwt() の鍵で署名）を /api/mcp に向けて出す
		jwt(),
		mcp({
			loginPage: "/login",
			consentPage: "/oauth/consent",
			resource: mcpResourceUrl(baseURL),
			scopes: [...MCP_SCOPES],
			// MCP のクライアントの多くは、使う前に自分で登録する（RFC 7591）。登録できるのは公開クライアントで、
			// つなぐたびに本人の同意（/oauth/consent）を求める
			allowDynamicClientRegistration: true,
			allowUnauthenticatedClientRegistration: true,
		}),
		// URL で名乗るクライアント（Client ID Metadata Document）。安全に読める場所でだけ使う
		...(platform.fetchClientMetadataResource
			? [
					cimd({
						fetchClientMetadataResource: platform.fetchClientMetadataResource,
						metadataProfile: "mcp-2026-07-28",
					}),
				]
			: []),
		// TanStack Start の server function からも Cookie を書けるようにする。必ず最後に置く
		tanstackStartCookies(),
	],
});

export const loginMethods = {
	email: true as const,
	discord: discord !== undefined,
};
