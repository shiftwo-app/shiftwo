import { createFileRoute, redirect, useRouter } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useId, useState } from "react";
import type { FormEvent } from "react";
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
	head: () => ({ meta: [{ title: "はじめに | shiftwo" }] }),
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
		<main className="mx-auto max-w-sm space-y-6 p-6">
			<h1 className="text-2xl font-bold">shiftwo へようこそ</h1>
			<p className="text-sm">
				{user.email} でアカウントを作りました。まず名前を決めてください。
				団体の中で使う表示名は、団体ごとにあとで変えられます。
			</p>
			<form onSubmit={submit} className="space-y-3">
				<label htmlFor={`${id}-name`} className="block text-sm">
					名前
				</label>
				<input
					id={`${id}-name`}
					required
					maxLength={NAME_MAX_LENGTH}
					autoComplete="name"
					value={name}
					onChange={(event) => setName(event.target.value)}
					className="w-full rounded border px-3 py-2"
				/>
				<button
					type="submit"
					disabled={busy}
					className="w-full rounded bg-blue-600 px-4 py-2 font-semibold text-white disabled:opacity-50"
				>
					はじめる
				</button>
			</form>
			{errors.length > 0 && (
				<ul role="alert" className="text-sm text-red-700">
					{errors.map((message) => (
						<li key={message}>{message}</li>
					))}
				</ul>
			)}
		</main>
	);
}
