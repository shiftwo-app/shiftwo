import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import EmailOrDiscordAuth from "../components/auth/EmailOrDiscordAuth";
import Logo from "../components/Logo";
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
	head: () => ({ meta: [{ title: "新規登録 | シフトヲ" }] }),
	component: SignupPage,
});

// 登録の流れ（案内板のように、番号を振って並べる）
const STEPS = [
	"Discord か、メールアドレス（確認コード）でアカウントを作ります",
	"名前を決めます",
	"団体を作るか、招待コードで団体に参加します",
];

function SignupPage() {
	const { redirect: redirectTo } = Route.useSearch();
	const methods = Route.useLoaderData();
	return (
		<main className="px-4 py-12 sm:py-20">
			<div className="mx-auto max-w-sm space-y-8">
				<Logo className="mx-auto h-16 w-auto text-ink" />
				<EmailOrDiscordAuth
					mode="signup"
					redirectTo={redirectTo}
					discordEnabled={methods.discord}
				/>
				<ol className="space-y-3 px-1 text-sm leading-relaxed text-ink-muted">
					{STEPS.map((step, index) => (
						<li key={step} className="flex gap-3">
							<span
								aria-hidden="true"
								className="tabular flex size-6 shrink-0 items-center justify-center rounded-full border border-line-strong text-xs font-bold text-ink"
							>
								{index + 1}
							</span>
							<span className="pt-0.5">{step}</span>
						</li>
					))}
				</ol>
				<p className="text-center text-sm text-ink-muted">
					アカウントをお持ちの方は{" "}
					<Link
						to="/login"
						search={{ redirect: redirectTo }}
						className="font-bold text-primary underline underline-offset-4 hover:text-primary-strong"
					>
						ログイン
					</Link>
				</p>
			</div>
		</main>
	);
}
