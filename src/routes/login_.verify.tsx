import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useState } from "react";
import Logo from "../components/Logo";
import LanguageSwitcher from "../components/shell/LanguageSwitcher";
import Alert from "../components/ui/Alert";
import Button from "../components/ui/Button";
import { authClient } from "../lib/auth-client";
import { useT } from "../lib/i18n/react";
import { translate } from "../lib/i18n/translate";
import { readOtp } from "../lib/read-otp";
import { wasLoginRequestedHere } from "../server/session.functions";

// ログインのメールのリンクの先（ファイル名の login_ で、/login の画面の子にしない）。
// - 開いただけではログインせず、ボタンを押してからにする（メールの安全チェックが先回りして開いても、
//   確認コードを使い切られないように）
// - ボタンを出すのは、このブラウザでそのアドレスにメールを送ったときだけ（ログイン CSRF 対策）
export const Route = createFileRoute("/login_/verify")({
	validateSearch: (search: Record<string, unknown>) => ({
		email: typeof search.email === "string" ? search.email : "",
		otp: readOtp(search.otp),
	}),
	loaderDeps: ({ search }) => ({ email: search.email }),
	loader: ({ deps }) => wasLoginRequestedHere({ data: { email: deps.email } }),
	head: ({ match }) => ({
		meta: [
			{
				title: translate(match.context.locale, "shell.pageTitle", {
					page: translate(match.context.locale, "auth.signIn"),
				}),
			},
		],
	}),
	component: VerifyPage,
});

function VerifyPage() {
	const { email, otp } = Route.useSearch();
	const requestedHere = Route.useLoaderData();
	const router = useRouter();
	const t = useT();
	const [busy, setBusy] = useState(false);
	const [error, setError] = useState<string | null>(null);

	const signIn = async () => {
		setBusy(true);
		setError(null);
		const { error } = await authClient.signIn.emailOtp({ email, otp });
		setBusy(false);
		if (error) {
			setError(t("auth.verifyLinkUnusable"));
			return;
		}
		router.history.push("/");
	};

	const body = () => {
		if (!email || !otp) {
			return <p className="text-sm text-ink">{t("auth.verifyLinkInvalid")}</p>;
		}
		if (!requestedHere) {
			return (
				<div
					role="alert"
					className="space-y-2 rounded-md border border-warn/40 bg-warn-soft px-3 py-2 text-sm leading-relaxed text-ink"
				>
					<p className="font-bold">
						{t("auth.verifyNotRequestedHere", { email })}
					</p>
					<p>{t("auth.verifyNotYoursHint")}</p>
					<p>{t("auth.verifyYoursHint")}</p>
				</div>
			);
		}
		return (
			<>
				<p className="text-sm text-ink">
					{t("auth.verifyAs")
						.split("{email}")
						.flatMap((part, index) =>
							index === 0
								? [part]
								: [
										<span key={index} className="font-bold break-all">
											{email}
										</span>,
										part,
									],
						)}
				</p>
				<Button
					variant="primary"
					onClick={signIn}
					disabled={busy}
					className="h-10 w-full"
				>
					{t("auth.verifySubmit")}
				</Button>
			</>
		);
	};

	return (
		<main className="px-4 py-12 sm:py-20">
			<div className="mx-auto max-w-sm space-y-8">
				<Logo className="mx-auto h-16 w-auto text-ink" />
				<div className="space-y-6">
					<h1 className="text-center text-2xl leading-tight font-bold tracking-tight text-ink">
						{t("auth.loginTitle")}
					</h1>
					<div className="space-y-5 rounded-xl border border-line bg-surface p-6">
						{body()}
						{error && <Alert tone="error">{error}</Alert>}
					</div>
				</div>
				<p className="text-center text-sm">
					<Link
						to="/login"
						search={{ redirect: "/" }}
						className="font-bold text-primary underline underline-offset-4 hover:text-primary-strong"
					>
						{t("auth.backToLogin")}
					</Link>
				</p>
				<LanguageSwitcher className="justify-center" />
			</div>
		</main>
	);
}
