import { createFileRoute, redirect, useRouter } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useId, useState } from "react";
import type { FormEvent } from "react";
import Logo from "../components/Logo";
import LanguageSwitcher from "../components/shell/LanguageSwitcher";
import Alert from "../components/ui/Alert";
import Button from "../components/ui/Button";
import { authClient } from "../lib/auth-client";
import { useT } from "../lib/i18n/react";
import { translate } from "../lib/i18n/translate";
import { NAME_MAX_LENGTH, suggestNameFromEmail } from "../lib/profile";
import { safeRedirectPath } from "../lib/safe-redirect";
import { completeOnboarding, getSession } from "../server/session.functions";

// はじめての設定。Discord でもメールでも、はじめてログインした人はここを通る
export const Route = createFileRoute("/welcome")({
	validateSearch: (search: Record<string, unknown>) => ({
		redirect: safeRedirectPath(search.redirect),
	}),
	beforeLoad: async ({ search }) => {
		const user = await getSession();
		if (!user) {
			throw redirect({ to: "/login", search: { redirect: "/welcome" } });
		}
		if (user.onboarded) throw redirect({ href: search.redirect });
		return { user };
	},
	head: ({ match }) => ({
		meta: [
			{
				title: translate(match.context.locale, "shell.pageTitle", {
					page: translate(match.context.locale, "auth.welcomePageTitle"),
				}),
			},
		],
	}),
	component: WelcomePage,
});

function WelcomePage() {
	const { user } = Route.useRouteContext();
	const { redirect: redirectTo } = Route.useSearch();
	const router = useRouter();
	const t = useT();
	const complete = useServerFn(completeOnboarding);
	const id = useId();
	const [name, setName] = useState(
		user.name.trim() || suggestNameFromEmail(user.email),
	);
	const [busy, setBusy] = useState(false);
	const [errors, setErrors] = useState<string[]>([]);

	const submit = async (event: FormEvent<HTMLFormElement>) => {
		event.preventDefault();
		setBusy(true);
		try {
			const result = await complete({ data: { name } });
			if (!result.ok) {
				setErrors(result.errors);
				return;
			}
			await router.invalidate();
			router.history.push(redirectTo);
		} catch (error) {
			console.error(error);
			setErrors([t("errors.saveFailed")]);
		} finally {
			setBusy(false);
		}
	};

	return (
		<main className="px-4 py-12 sm:py-20">
			<div className="mx-auto max-w-sm space-y-8">
				<Logo className="mx-auto h-16 w-auto text-ink" />
				<div className="space-y-3 text-center">
					<h1 className="text-2xl leading-tight font-bold tracking-tight text-ink">
						{t("auth.welcomeTitle")}
					</h1>
					<p className="text-sm leading-relaxed text-ink-muted">
						{t("auth.welcomeBody")
							.split("{email}")
							.flatMap((part, index) =>
								index === 0
									? [part]
									: [
											<span key={index} className="break-all">
												{user.email}
											</span>,
											part,
										],
							)}
					</p>
				</div>
				<div className="space-y-5 rounded-xl border border-line bg-surface p-6">
					<form onSubmit={submit} className="space-y-4">
						<div className="flex flex-col gap-1">
							<label
								htmlFor={`${id}-name`}
								className="text-sm font-bold text-ink"
							>
								{t("auth.nameLabel")}
							</label>
							<input
								id={`${id}-name`}
								required
								maxLength={NAME_MAX_LENGTH}
								autoComplete="name"
								value={name}
								onChange={(event) => setName(event.target.value)}
								className="control w-full"
							/>
						</div>
						<Button
							type="submit"
							variant="primary"
							disabled={busy}
							className="h-10 w-full"
						>
							{t("auth.welcomeSubmit")}
						</Button>
					</form>
					{errors.length > 0 && (
						<Alert tone="error">
							<ul className="space-y-1">
								{errors.map((message) => (
									<li key={message}>{message}</li>
								))}
							</ul>
						</Alert>
					)}
				</div>
				<div className="space-y-3 text-center text-sm">
					<p className="leading-relaxed text-ink-muted">
						{t("auth.welcomeNext")}
					</p>
					<button
						type="button"
						onClick={async () => {
							await authClient.signOut();
							router.history.push("/login");
						}}
						className="text-ink-muted underline underline-offset-4 hover:text-ink"
					>
						{t("auth.welcomeSwitchAccount")}
					</button>
				</div>
				<LanguageSwitcher className="justify-center" />
			</div>
		</main>
	);
}
