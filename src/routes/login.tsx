import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import EmailOrDiscordAuth from "../components/auth/EmailOrDiscordAuth";
import Logo from "../components/Logo";
import LanguageSwitcher from "../components/shell/LanguageSwitcher";
import Alert from "../components/ui/Alert";
import type { Translate } from "../lib/i18n/translate";
import { translate } from "../lib/i18n/translate";
import { useT } from "../lib/i18n/react";
import { isServerPath, oauthResumePath } from "../lib/oauth-resume";
import { safeRedirectPath } from "../lib/safe-redirect";
import { getLoginMethods, getSession } from "../server/session.functions";

export const Route = createFileRoute("/login")({
	validateSearch: (
		search: Record<string, unknown>,
	): { redirect: string; error?: string } => ({
		// MCP のクライアントの認可の途中なら、ログインのあとはその続きへ。そうでなければ ?redirect= の戻り先へ
		redirect: oauthResumePath(search) ?? safeRedirectPath(search.redirect),
		// Discord から戻ってきたときのエラー（Better Auth が付ける）
		...(typeof search.error === "string" ? { error: search.error } : {}),
	}),
	beforeLoad: async ({ search }) => {
		// ログイン済みなら、戻り先へ
		if (await getSession()) {
			throw redirect({
				href: search.redirect,
				reloadDocument: isServerPath(search.redirect),
			});
		}
	},
	loader: () => getLoginMethods(),
	head: ({ match }) => ({
		meta: [
			{
				title: translate(match.context.locale, "shell.pageTitle", {
					page: translate(match.context.locale, "auth.signIn"),
				}),
			},
		],
	}),
	component: LoginPage,
});

/** Better Auth のエラーコードを、画面に出す文に */
const loginErrorMessage = (t: Translate, code: string): string =>
	code === "email_not_verified"
		? t("auth.discordEmailNotVerified")
		: t("auth.discordLoginFailed");

function LoginPage() {
	const { redirect: redirectTo, error } = Route.useSearch();
	const methods = Route.useLoaderData();
	const t = useT();
	return (
		<main className="px-4 py-12 sm:py-20">
			<div className="mx-auto max-w-sm space-y-8">
				<Logo className="mx-auto h-16 w-auto text-ink" />
				<EmailOrDiscordAuth
					mode="login"
					redirectTo={redirectTo}
					discordEnabled={methods.discord}
					notice={
						error && <Alert tone="error">{loginErrorMessage(t, error)}</Alert>
					}
				/>
				<p className="text-center text-sm text-ink-muted">
					{t("auth.signupPrompt")}{" "}
					<Link
						to="/signup"
						search={{ redirect: redirectTo }}
						className="font-bold text-primary underline underline-offset-4 hover:text-primary-strong"
					>
						{t("auth.signupLink")}
					</Link>
				</p>
				<LanguageSwitcher className="justify-center" />
			</div>
		</main>
	);
}
