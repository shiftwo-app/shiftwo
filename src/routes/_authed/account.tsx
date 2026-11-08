import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import AvatarUploader from "../../components/AvatarUploader";
import { DiscordMark } from "../../components/auth/EmailOrDiscordAuth";
import Alert from "../../components/ui/Alert";
import Badge from "../../components/ui/Badge";
import Button from "../../components/ui/Button";
import PageHeader from "../../components/ui/PageHeader";
import Section from "../../components/ui/Section";
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
	head: () => ({ meta: [{ title: "アカウント | シフトヲ" }] }),
	component: AccountPage,
});

function AccountPage() {
	const summary = Route.useLoaderData();
	const { linked } = Route.useSearch();
	const router = useRouter();
	const refresh = useServerFn(refreshMyDiscordStatus);
	const [busy, setBusy] = useState(false);
	const [message, setMessage] = useState<{
		text: string;
		tone: "error" | "success";
	} | null>(null);

	// Discord を連携して戻ってきたら、団体の Discord サーバーの条件を確かめ直す（アイコンも更新する）
	useEffect(() => {
		if (!linked || !summary.discordAccountId) return;
		void refresh().then(() =>
			setMessage({ text: "Discord と連携しました", tone: "success" }),
		);
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
		setMessage(
			error
				? {
						text: "連携を外せませんでした。時間をおいて、もう一度試してください",
						tone: "error",
					}
				: { text: "Discord の連携を外しました", tone: "success" },
		);
		await router.invalidate();
	};

	const textLink =
		"font-bold text-primary underline underline-offset-4 hover:text-primary-strong";

	return (
		<main className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
			<PageHeader title="アカウント" />
			{message && (
				<Alert tone={message.tone} className="mb-6">
					{message.text}
				</Alert>
			)}
			<Section
				id="account-avatar"
				title="アイコン"
				description="一覧やシフト表に出ます。団体ごとに別のアイコンにもできます（団体の「設定・メンバー」から）。"
			>
				<AvatarUploader
					endpoint="/api/me/avatar"
					name={summary.name}
					currentUrl={summary.avatarUrl}
					hasUploaded={summary.hasUploadedAvatar}
					removeLabel={
						summary.discordAccountId
							? "Discord のアイコンに戻す"
							: "アイコンをやめる"
					}
					onChanged={() => router.invalidate()}
				/>
			</Section>
			<Section id="account-email" title="メールアドレス">
				<p className="text-sm leading-relaxed text-ink">
					<span className="font-bold break-all">{summary.email}</span>
					<span className="text-ink-muted">
						（確認コードでいつでもログインできます）
					</span>
				</p>
			</Section>
			<Section
				id="account-discord"
				title="Discord"
				description={
					<>
						連携すると、Discord
						のユーザー名・アイコン・メールアドレス、参加しているサーバーの一覧、
						サーバーでのプロフィール（メンバーかどうかとアイコン）を読みます（
						<a href="/help/discord-server" className={textLink}>
							くわしく
						</a>
						）。
					</>
				}
			>
				{!summary.discordConfigured ? (
					<p className="text-sm text-ink-muted">
						このシフトヲでは、Discord の連携は使えません。
					</p>
				) : summary.discordAccountId ? (
					<div className="flex flex-wrap items-center gap-3 text-sm">
						<Badge tone="primary">連携しています</Badge>
						<span className="text-ink-muted">Discord でもログインできます</span>
						<Button variant="ghost" size="sm" onClick={unlink} disabled={busy}>
							連携を外す
						</Button>
					</div>
				) : (
					<div className="space-y-3 text-sm">
						<p className="max-w-prose leading-relaxed text-ink">
							Discord を連携すると、Discord でもログインでき、Discord
							のアイコンが使われます。 Discord
							サーバーのメンバーだけが参加できる団体にも参加できるようになります。
						</p>
						<Button onClick={link} disabled={busy}>
							<DiscordMark />
							Discord と連携する
						</Button>
					</div>
				)}
			</Section>
		</main>
	);
}
