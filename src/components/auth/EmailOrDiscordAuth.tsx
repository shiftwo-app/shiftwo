import { useRouter } from "@tanstack/react-router";
import { useId, useState } from "react";
import type { FormEvent, ReactNode } from "react";
import { goTo } from "../../lib/oauth-resume";
import { authClient } from "../../lib/auth-client";
import type { MessageKey } from "../../lib/i18n/messages";
import { useT } from "../../lib/i18n/react";
import { markLoginRequested } from "../../server/session.functions";
import Alert from "../ui/Alert";
import Button from "../ui/Button";

type Step = { name: "email" } | { name: "code"; email: string };

export type AuthMode = "login" | "signup";

const COPY: Record<
	AuthMode,
	{ title: MessageKey; sendLabel: MessageKey; discordLabel: MessageKey }
> = {
	login: {
		title: "auth.loginTitle",
		sendLabel: "auth.loginSendLabel",
		discordLabel: "auth.loginDiscordLabel",
	},
	signup: {
		title: "auth.signupTitle",
		sendLabel: "auth.signupSendLabel",
		discordLabel: "auth.signupDiscordLabel",
	},
};

/** Discord のマーク（文字色で塗る） */
export const DiscordMark = () => (
	<svg
		viewBox="0 0 24 24"
		fill="currentColor"
		aria-hidden="true"
		className="size-4 shrink-0"
	>
		<path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z" />
	</svg>
);

/**
 * ログインと新規登録の画面の中身（どちらも同じ仕組み：Discord か、メールの確認コード＋リンク）。
 * はじめての人はアカウントが作られ、そのあと /welcome で名前を決める
 */
const EmailOrDiscordAuth = ({
	mode,
	redirectTo,
	discordEnabled,
	notice,
}: {
	mode: AuthMode;
	redirectTo: string;
	discordEnabled: boolean;
	/** 見出しと入力欄のあいだに出すお知らせ（Discord から戻ってきたときのエラーなど） */
	notice?: ReactNode;
}) => {
	const copy = COPY[mode];
	const t = useT();
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
			setError(t("auth.emailInvalid"));
			return;
		}
		const { error } = await authClient.emailOtp.sendVerificationOtp({
			email,
			type: "sign-in",
		});
		setBusy(false);
		if (error) {
			setError(t("auth.emailSendFailed"));
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
			setError(t("auth.codeInvalid"));
			return;
		}
		goTo(router, redirectTo);
	};

	const signInWithDiscord = () =>
		authClient.signIn.social({ provider: "discord", callbackURL: redirectTo });

	const link =
		"font-bold text-primary underline underline-offset-4 hover:text-primary-strong disabled:cursor-not-allowed disabled:opacity-50";

	return (
		<div className="space-y-6">
			<h1 className="text-center text-2xl leading-tight font-bold tracking-tight text-ink">
				{t(copy.title)}
			</h1>

			{notice}

			{/* 入力の面は 1 枚だけにする */}
			<div className="space-y-5 rounded-xl border border-line bg-surface p-6">
				{discordEnabled && (
					<>
						<Button
							variant="secondary"
							onClick={signInWithDiscord}
							className="h-10 w-full"
						>
							<DiscordMark />
							{t(copy.discordLabel)}
						</Button>
						<p className="flex items-center gap-3 text-xs text-ink-muted">
							<span aria-hidden="true" className="h-px flex-1 bg-line" />
							{t("auth.or")}
							<span aria-hidden="true" className="h-px flex-1 bg-line" />
						</p>
					</>
				)}

				{step.name === "email" ? (
					<form onSubmit={sendCode} className="space-y-4">
						<div className="flex flex-col gap-1">
							<label
								htmlFor={`${id}-email`}
								className="text-sm font-bold text-ink"
							>
								{t("auth.emailLabel")}
							</label>
							<input
								id={`${id}-email`}
								type="email"
								required
								autoComplete="email"
								value={email}
								onChange={(event) => setEmail(event.target.value)}
								className="control w-full"
							/>
						</div>
						<Button
							type="submit"
							variant="primary"
							disabled={busy}
							className="h-10 w-full"
						>
							{t(copy.sendLabel)}
						</Button>
					</form>
				) : (
					<form onSubmit={verify} className="space-y-4">
						<Alert tone="info">
							{/* メールアドレスだけ太字にする（文の中の {email} の位置に差し込む） */}
							{t("auth.codeSent")
								.split("{email}")
								.flatMap((part, index) =>
									index === 0
										? [part]
										: [
												<span key={index} className="font-bold break-all">
													{step.email}
												</span>,
												part,
											],
								)}
						</Alert>
						<div className="flex flex-col gap-1">
							<label
								htmlFor={`${id}-otp`}
								className="text-sm font-bold text-ink"
							>
								{t("auth.codeLabel")}
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
								className="control tabular w-full py-2 text-center text-2xl tracking-[0.4em]"
							/>
						</div>
						<Button
							type="submit"
							variant="primary"
							disabled={busy}
							className="h-10 w-full"
						>
							{t("auth.signIn")}
						</Button>
						<div className="flex justify-between text-sm">
							<button
								type="button"
								onClick={() => {
									setStep({ name: "email" });
									setOtp("");
								}}
								className={link}
							>
								{t("auth.changeEmail")}
							</button>
							<button
								type="button"
								disabled={busy}
								onClick={() => sendCode()}
								className={link}
							>
								{t("auth.resend")}
							</button>
						</div>
					</form>
				)}

				{error && <Alert tone="error">{error}</Alert>}
			</div>
		</div>
	);
};

export default EmailOrDiscordAuth;
