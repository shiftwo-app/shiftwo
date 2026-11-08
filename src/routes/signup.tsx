import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import EmailOrDiscordAuth from "../components/auth/EmailOrDiscordAuth";
import { safeRedirectPath } from "../lib/safe-redirect";
import { getLoginMethods, getSession } from "../server/session.functions";

export const Route = createFileRoute("/signup")({
	validateSearch: (search: Record<string, unknown>) => ({
		redirect: safeRedirectPath(search.redirect),
	}),
	beforeLoad: async ({ search }) => {
		if (await getSession()) throw redirect({ href: search.redirect });
	},
	loader: () => getLoginMethods(),
	head: () => ({ meta: [{ title: "新規登録 | shiftwo" }] }),
	component: SignupPage,
});

function SignupPage() {
	const { redirect: redirectTo } = Route.useSearch();
	const methods = Route.useLoaderData();
	return (
		<main className="mx-auto max-w-sm space-y-6 p-6">
			<EmailOrDiscordAuth
				mode="signup"
				redirectTo={redirectTo}
				discordEnabled={methods.discord}
			/>
			<ol className="list-decimal space-y-1 pl-5 text-sm text-gray-600">
				<li>Discord か、メールアドレス（確認コード）でアカウントを作ります</li>
				<li>名前を決めます</li>
				<li>団体を作るか、招待コードで団体に参加します</li>
			</ol>
			<p className="text-sm">
				アカウントをお持ちの方は{" "}
				<Link
					to="/login"
					search={{ redirect: redirectTo }}
					className="underline"
				>
					ログイン
				</Link>
			</p>
		</main>
	);
}
