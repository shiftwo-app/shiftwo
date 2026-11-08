import { useRouter } from "@tanstack/react-router";
import { useId, useState } from "react";
import type { FormEvent } from "react";
import { authClient } from "../../lib/auth-client";
import { markLoginRequested } from "../../server/session.functions";

type Step = { name: "email" } | { name: "code"; email: string };

export type AuthMode = "login" | "signup";

const COPY: Record<
	AuthMode,
	{ title: string; sendLabel: string; discordLabel: string }
> = {
	login: {
		title: "shiftwo にログイン",
		sendLabel: "ログイン用のメールを送る",
		discordLabel: "Discord でログイン",
	},
	signup: {
		title: "shiftwo に新規登録",
		sendLabel: "登録用のメールを送る",
		discordLabel: "Discord で登録",
	},
};

/**
 * ログインと新規登録の画面の中身（どちらも同じ仕組み：Discord か、メールの確認コード＋リンク）。
 * はじめての人はアカウントが作られ、そのあと /welcome で名前を決める
 */
const EmailOrDiscordAuth = ({
	mode,
	redirectTo,
	discordEnabled,
}: {
	mode: AuthMode;
	redirectTo: string;
	discordEnabled: boolean;
}) => {
	const copy = COPY[mode];
	const router = useRouter();
	const id = useId();
	const [step, setStep] = useState<Step>({ name: "email" });
	const [email, setEmail] = useState("");
	const [otp, setOtp] = useState("");
	const [busy, setBusy] = useState(false);
	const [error, setError] = useState<string | null>(null);

	const sendCode = async (event?: FormEvent<HTMLFormElement>) => {
		event?.preventDefault();
		setBusy(true);
		setError(null);
		try {
			// このブラウザでメールを送ったことを残す（メールのリンクを押すだけでログインできるのは、このブラウザだけ）
			await markLoginRequested({ data: { email } });
		} catch {
			setBusy(false);
			setError("メールアドレスの形を確かめてください");
			return;
		}
		const { error } = await authClient.emailOtp.sendVerificationOtp({
			email,
			type: "sign-in",
		});
		setBusy(false);
		if (error) {
			setError(
				"メールを送れませんでした。アドレスを確かめて、もう一度試してください",
			);
			return;
		}
		setStep({ name: "code", email });
	};

	const verify = async (event: FormEvent<HTMLFormElement>) => {
		event.preventDefault();
		if (step.name !== "code") return;
		setBusy(true);
		setError(null);
		const { error } = await authClient.signIn.emailOtp({
			email: step.email,
			otp: otp.trim(),
		});
		setBusy(false);
		if (error) {
			setError("確認コードが違うか、期限が切れています");
			return;
		}
		router.history.push(redirectTo);
	};

	const signInWithDiscord = () =>
		authClient.signIn.social({ provider: "discord", callbackURL: redirectTo });

	const control = "w-full rounded border px-3 py-2";
	const primary =
		"w-full rounded bg-blue-600 px-4 py-2 font-semibold text-white disabled:opacity-50";

	return (
		<div className="space-y-6">
			<h1 className="text-2xl font-bold">{copy.title}</h1>

			{discordEnabled && (
				<>
					<button
						type="button"
						onClick={signInWithDiscord}
						className="w-full rounded bg-[#5865F2] px-4 py-2 font-semibold text-white"
					>
						{copy.discordLabel}
					</button>
					<p className="text-center text-sm text-gray-500">または</p>
				</>
			)}

			{step.name === "email" ? (
				<form onSubmit={sendCode} className="space-y-3">
					<label htmlFor={`${id}-email`} className="block text-sm">
						メールアドレス
					</label>
					<input
						id={`${id}-email`}
						type="email"
						required
						autoComplete="email"
						value={email}
						onChange={(event) => setEmail(event.target.value)}
						className={control}
					/>
					<button type="submit" disabled={busy} className={primary}>
						{copy.sendLabel}
					</button>
				</form>
			) : (
				<form onSubmit={verify} className="space-y-3">
					<p className="text-sm">
						{step.email}{" "}
						にメールを送りました。メールのリンクを開くか、確認コードを入力してください。
					</p>
					<label htmlFor={`${id}-otp`} className="block text-sm">
						確認コード（6 桁）
					</label>
					<input
						id={`${id}-otp`}
						inputMode="numeric"
						autoComplete="one-time-code"
						pattern="[0-9]{6}"
						maxLength={6}
						required
						value={otp}
						onChange={(event) => setOtp(event.target.value)}
						className={`${control} text-center text-xl tracking-widest`}
					/>
					<button type="submit" disabled={busy} className={primary}>
						ログイン
					</button>
					<div className="flex justify-between text-sm">
						<button
							type="button"
							onClick={() => {
								setStep({ name: "email" });
								setOtp("");
							}}
							className="underline"
						>
							アドレスを変える
						</button>
						<button
							type="button"
							disabled={busy}
							onClick={() => sendCode()}
							className="underline"
						>
							もう一度送る
						</button>
					</div>
				</form>
			)}

			{error && (
				<p role="alert" className="text-sm text-red-700">
					{error}
				</p>
			)}
		</div>
	);
};

export default EmailOrDiscordAuth;
