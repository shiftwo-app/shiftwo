import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useState } from "react";
import { authClient } from "../lib/auth-client";
import { readOtp } from "../lib/read-otp";

// ログインのメールのリンクの先。開いただけではログインせず、ボタンを押してからログインする
// （メールの安全チェックがリンクを先回りして開いても、確認コードを使い切られないように）
// ファイル名の login_ で、/login の画面の子にしない（親のチェックや画面に入らないように）
export const Route = createFileRoute("/login_/verify")({
	validateSearch: (search: Record<string, unknown>) => ({
		email: typeof search.email === "string" ? search.email : "",
		otp: readOtp(search.otp),
	}),
	head: () => ({ meta: [{ title: "ログイン | shiftwo" }] }),
	component: VerifyPage,
});

function VerifyPage() {
	const { email, otp } = Route.useSearch();
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

	return (
		<main className="mx-auto max-w-sm space-y-6 p-6">
			<h1 className="text-2xl font-bold">shiftwo にログイン</h1>
			{email && otp ? (
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
			) : (
				<p className="text-sm">リンクが正しくありません。</p>
			)}
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
