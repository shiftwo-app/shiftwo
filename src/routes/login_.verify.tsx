import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useState } from "react";
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
	head: () => ({ meta: [{ title: "ログイン | shiftwo" }] }),
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
			return <p className="text-sm">リンクが正しくありません。</p>;
		}
		if (!requestedHere) {
			return (
				<div
					role="alert"
					className="space-y-2 rounded border border-amber-400 bg-amber-50 p-3 text-sm"
				>
					<p className="font-semibold">
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
				<p className="text-sm">{email} としてログインします。</p>
				<button
					type="button"
					onClick={signIn}
					disabled={busy}
					className="w-full rounded bg-blue-600 px-4 py-2 font-semibold text-white disabled:opacity-50"
				>
					ログインする
				</button>
			</>
		);
	};

	return (
		<main className="mx-auto max-w-sm space-y-6 p-6">
			<h1 className="text-2xl font-bold">shiftwo にログイン</h1>
			{body()}
			{error && (
				<p role="alert" className="text-sm text-red-700">
					{error}
				</p>
			)}
			<Link
				to="/login"
				search={{ redirect: "/" }}
				className="block text-sm underline"
			>
				ログイン画面へ
			</Link>
		</main>
	);
}
