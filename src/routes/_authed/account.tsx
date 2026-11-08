import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { authClient } from "../../lib/auth-client";
import {
	getAccountSummary,
	refreshMyDiscordStatus,
} from "../../server/discord.functions";

// アカウントの設定：ログインの方法（メールと Discord の連携）
export const Route = createFileRoute("/_authed/account")({
	validateSearch: (search: Record<string, unknown>): { linked?: boolean } =>
		search.linked ? { linked: true } : {},
	loader: () => getAccountSummary(),
	head: () => ({ meta: [{ title: "アカウント | shiftwo" }] }),
	component: AccountPage,
});

function AccountPage() {
	const summary = Route.useLoaderData();
	const { linked } = Route.useSearch();
	const router = useRouter();
	const refresh = useServerFn(refreshMyDiscordStatus);
	const [busy, setBusy] = useState(false);
	const [message, setMessage] = useState<string | null>(null);

	// Discord を連携して戻ってきたら、団体の Discord サーバーの条件を確かめ直す（アイコンも更新する）
	useEffect(() => {
		if (!linked || !summary.discordAccountId) return;
		void refresh().then(() => setMessage("Discord と連携しました"));
	}, [linked, summary.discordAccountId, refresh]);

	const link = async () => {
		setBusy(true);
		await authClient.linkSocial({
			provider: "discord",
			callbackURL: "/account?linked=1",
		});
		setBusy(false);
	};

	const unlink = async () => {
		if (!summary.discordAccountId) return;
		setBusy(true);
		const { error } = await authClient.unlinkAccount({
			accountId: summary.discordAccountId,
		});
		setBusy(false);
		setMessage(error ? "連携を外せませんでした" : "Discord の連携を外しました");
		await router.invalidate();
	};

	return (
		<main className="mx-auto max-w-lg space-y-6 p-6">
			<h1 className="text-2xl font-bold">アカウント</h1>
			<section className="space-y-2">
				<h2 className="font-semibold">メールアドレス</h2>
				<p className="text-sm">
					{summary.email}（確認コードでいつでもログインできます）
				</p>
			</section>
			<section className="space-y-2">
				<h2 className="font-semibold">Discord</h2>
				{!summary.discordConfigured ? (
					<p className="text-sm text-gray-600">
						この shiftwo では、Discord の連携は使えません。
					</p>
				) : summary.discordAccountId ? (
					<div className="flex flex-wrap items-center gap-3 text-sm">
						<span>連携しています（Discord でもログインできます）</span>
						<button
							type="button"
							onClick={unlink}
							disabled={busy}
							className="underline"
						>
							連携を外す
						</button>
					</div>
				) : (
					<div className="space-y-2 text-sm">
						<p>
							Discord を連携すると、Discord でもログインでき、Discord
							のアイコンが使われます。 Discord
							サーバーのメンバーだけが参加できる団体にも参加できるようになります。
						</p>
						<button
							type="button"
							onClick={link}
							disabled={busy}
							className="rounded bg-[#5865F2] px-4 py-2 font-semibold text-white disabled:opacity-50"
						>
							Discord と連携する
						</button>
					</div>
				)}
				<p className="text-xs text-gray-500">
					連携すると、Discord
					のユーザー名・アイコン・メールアドレス、参加しているサーバーの一覧、
					サーバーでのプロフィール（メンバーかどうかとアイコン）を読みます（
					<a href="/help/discord-server" className="underline">
						くわしく
					</a>
					）。
				</p>
			</section>
			{message && (
				<p role="status" className="text-sm">
					{message}
				</p>
			)}
		</main>
	);
}
