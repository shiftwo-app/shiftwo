import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import EmailOrDiscordAuth from "../components/auth/EmailOrDiscordAuth";
import Logo from "../components/Logo";
import Alert from "../components/ui/Alert";
import { safeRedirectPath } from "../lib/safe-redirect";
import { getLoginMethods, getSession } from "../server/session.functions";

export const Route = createFileRoute("/login")({
	validateSearch: (
		search: Record<string, unknown>,
	): { redirect: string; error?: string } => ({
		redirect: safeRedirectPath(search.redirect),
		// Discord から戻ってきたときのエラー（Better Auth が付ける）
		...(typeof search.error === "string" ? { error: search.error } : {}),
	}),
	beforeLoad: async ({ search }) => {
		// ログイン済みなら、戻り先へ
		if (await getSession()) throw redirect({ href: search.redirect });
	},
	loader: () => getLoginMethods(),
	head: () => ({ meta: [{ title: "ログイン | シフトヲ" }] }),
	component: LoginPage,
});

/** Better Auth のエラーコードを、画面に出す文に */
const loginErrorMessage = (code: string): string =>
	code === "email_not_verified"
		? "Discord のメールアドレスが確認されていません。Discord でメールアドレスを確認してから、もう一度試してください"
		: "ログインできませんでした。Discord のメールアドレスが確認済みか確かめて、もう一度試してください";

function LoginPage() {
	const { redirect: redirectTo, error } = Route.useSearch();
	const methods = Route.useLoaderData();
	return (
		<main className="px-4 py-12 sm:py-20">
			<div className="mx-auto max-w-sm space-y-8">
				<Logo className="mx-auto h-16 w-auto text-ink" />
				<EmailOrDiscordAuth
					mode="login"
					redirectTo={redirectTo}
					discordEnabled={methods.discord}
					notice={
						error && <Alert tone="error">{loginErrorMessage(error)}</Alert>
					}
				/>
				<p className="text-center text-sm text-ink-muted">
					はじめての方は{" "}
					<Link
						to="/signup"
						search={{ redirect: redirectTo }}
						className="font-bold text-primary underline underline-offset-4 hover:text-primary-strong"
					>
						新規登録
					</Link>
				</p>
			</div>
		</main>
	);
}
