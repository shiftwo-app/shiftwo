import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useState } from "react";
import Logo from "../components/Logo";
import Alert from "../components/ui/Alert";
import Button from "../components/ui/Button";
import { authClient } from "../lib/auth-client";
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
	head: () => ({ meta: [{ title: "ログイン | シフトヲ" }] }),
	component: VerifyPage,
});

function VerifyPage() {
	const { email, otp } = Route.useSearch();
	const requestedHere = Route.useLoaderData();
	const router = useRouter();
	const [busy, setBusy] = useState(false);
	const [error, setError] = useState<string | null>(null);

	const signIn = async () => {
		setBusy(true);
		setError(null);
		const { error } = await authClient.signIn.emailOtp({ email, otp });
		setBusy(false);
		if (error) {
			setError(
				"このリンクは使えません（期限切れか、使用済みです）。もう一度ログイン用のメールを送ってください",
			);
			return;
		}
		router.history.push("/");
	};

	const body = () => {
		if (!email || !otp) {
			return <p className="text-sm text-ink">リンクが正しくありません。</p>;
		}
		if (!requestedHere) {
			return (
				<div
					role="alert"
					className="space-y-2 rounded-md border border-warn/40 bg-warn-soft px-3 py-2 text-sm leading-relaxed text-ink"
				>
					<p className="font-bold">
						このブラウザからは、{email} にログイン用のメールを送っていません。
					</p>
					<p>
						自分で送ったメールでなければ、このページを閉じてください（他人のアカウントにログインさせる手口の場合があります）。
					</p>
					<p>
						自分で送った場合は、メールを送ったブラウザで確認コードを入力するか、このブラウザでログイン画面からやり直してください。
					</p>
				</div>
			);
		}
		return (
			<>
				<p className="text-sm text-ink">
					<span className="font-bold break-all">{email}</span>{" "}
					としてログインします。
				</p>
				<Button
					variant="primary"
					onClick={signIn}
					disabled={busy}
					className="h-10 w-full"
				>
					ログインする
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
						シフトヲにログイン
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
						ログイン画面へ
					</Link>
				</p>
			</div>
		</main>
	);
}
