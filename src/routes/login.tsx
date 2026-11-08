import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import EmailOrDiscordAuth from "../components/auth/EmailOrDiscordAuth";
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
	head: () => ({ meta: [{ title: "ログイン | shiftwo" }] }),
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
		<main className="mx-auto max-w-sm space-y-6 p-6">
			{error && (
				<p
					role="alert"
					className="rounded border border-red-300 bg-red-50 p-3 text-sm text-red-800"
				>
					{loginErrorMessage(error)}
				</p>
			)}
			<EmailOrDiscordAuth
				mode="login"
				redirectTo={redirectTo}
				discordEnabled={methods.discord}
			/>
			<p className="text-sm">
				はじめての方は{" "}
				<Link
					to="/signup"
					search={{ redirect: redirectTo }}
					className="underline"
				>
					新規登録
				</Link>
			</p>
		</main>
	);
}
