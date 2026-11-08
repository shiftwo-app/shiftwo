import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import EmailOrDiscordAuth from "../components/auth/EmailOrDiscordAuth";
import { safeRedirectPath } from "../lib/safe-redirect";
import { getLoginMethods, getSession } from "../server/session.functions";

export const Route = createFileRoute("/login")({
	validateSearch: (search: Record<string, unknown>) => ({
		redirect: safeRedirectPath(search.redirect),
	}),
	beforeLoad: async ({ search }) => {
		// ログイン済みなら、戻り先へ
		if (await getSession()) throw redirect({ href: search.redirect });
	},
	loader: () => getLoginMethods(),
	head: () => ({ meta: [{ title: "ログイン | shiftwo" }] }),
	component: LoginPage,
});

function LoginPage() {
	const { redirect: redirectTo } = Route.useSearch();
	const methods = Route.useLoaderData();
	return (
		<main className="mx-auto max-w-sm space-y-6 p-6">
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
