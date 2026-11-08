import { createFileRoute, redirect, useRouter } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useId, useState } from "react";
import type { FormEvent } from "react";
import Logo from "../components/Logo";
import Alert from "../components/ui/Alert";
import Button from "../components/ui/Button";
import { authClient } from "../lib/auth-client";
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
	head: () => ({ meta: [{ title: "はじめに | シフトヲ" }] }),
	component: WelcomePage,
});

function WelcomePage() {
	const { user } = Route.useRouteContext();
	const { redirect: redirectTo } = Route.useSearch();
	const router = useRouter();
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
			setErrors(["保存できませんでした。時間をおいて、もう一度試してください"]);
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
						シフトヲへようこそ
					</h1>
					<p className="text-sm leading-relaxed text-ink-muted">
						<span className="break-all">{user.email}</span>{" "}
						でアカウントを作りました。まず名前を決めてください。
						団体の中で使う表示名は、団体ごとにあとで変えられます。
					</p>
				</div>
				<div className="space-y-5 rounded-xl border border-line bg-surface p-6">
					<form onSubmit={submit} className="space-y-4">
						<div className="flex flex-col gap-1">
							<label
								htmlFor={`${id}-name`}
								className="text-sm font-bold text-ink"
							>
								名前
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
							はじめる
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
						名前を決めたら、団体を作るか、招待コードで団体に参加します。
					</p>
					<button
						type="button"
						onClick={async () => {
							await authClient.signOut();
							router.history.push("/login");
						}}
						className="text-ink-muted underline underline-offset-4 hover:text-ink"
					>
						別のアカウントでログインする（ログアウト）
					</button>
				</div>
			</div>
		</main>
	);
}
