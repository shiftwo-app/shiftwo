import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import EmailOrDiscordAuth from "../components/auth/EmailOrDiscordAuth";
import Logo from "../components/Logo";
import LanguageSwitcher from "../components/shell/LanguageSwitcher";
import type { MessageKey } from "../lib/i18n/messages";
import { useT } from "../lib/i18n/react";
import { translate } from "../lib/i18n/translate";
import { isServerPath } from "../lib/oauth-resume";
import { safeRedirectPath } from "../lib/safe-redirect";
import { getLoginMethods, getSession } from "../server/session.functions";

export const Route = createFileRoute("/signup")({
	validateSearch: (search: Record<string, unknown>) => ({
		redirect: safeRedirectPath(search.redirect),
	}),
	beforeLoad: async ({ search }) => {
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
					page: translate(match.context.locale, "auth.signupLink"),
				}),
			},
		],
	}),
	component: SignupPage,
});

// 登録の流れ（案内板のように、番号を振って並べる）
const STEPS: MessageKey[] = [
	"auth.signupStepAccount",
	"auth.signupStepName",
	"auth.signupStepOrg",
];

function SignupPage() {
	const { redirect: redirectTo } = Route.useSearch();
	const methods = Route.useLoaderData();
	const t = useT();
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
							<span className="pt-0.5">{t(step)}</span>
						</li>
					))}
				</ol>
				<p className="text-center text-sm text-ink-muted">
					{t("auth.loginPrompt")}{" "}
					<Link
						to="/login"
						search={{ redirect: redirectTo }}
						className="font-bold text-primary underline underline-offset-4 hover:text-primary-strong"
					>
						{t("auth.signIn")}
					</Link>
				</p>
				<LanguageSwitcher className="justify-center" />
			</div>
		</main>
	);
}
