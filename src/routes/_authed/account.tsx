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
import { useT } from "../../lib/i18n/react";
import { translate } from "../../lib/i18n/translate";
import { isLocale, LOCALE_NAMES, LOCALES } from "../../lib/i18n/locales";
import { setLocaleFn } from "../../server/locale.functions";
import {
	getAccountSummary,
	refreshMyDiscordStatus,
} from "../../server/discord.functions";

// アカウントの設定：ログインの方法（メールと Discord の連携）
export const Route = createFileRoute("/_authed/account")({
	validateSearch: (search: Record<string, unknown>): { linked?: boolean } =>
		search.linked ? { linked: true } : {},
	loader: () => getAccountSummary(),
	head: ({ match }) => ({
		meta: [
			{
				title: translate(match.context.locale, "shell.pageTitle", {
					page: translate(match.context.locale, "account.title"),
				}),
			},
		],
	}),
	component: AccountPage,
});

function AccountPage() {
	const summary = Route.useLoaderData();
	const { linked } = Route.useSearch();
	const router = useRouter();
	const t = useT();
	const { user } = Route.useRouteContext();
	const setLocale = useServerFn(setLocaleFn);
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
			setMessage({ text: t("account.discordLinked"), tone: "success" }),
		);
	}, [linked, summary.discordAccountId, refresh, t]);

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
						text: t("account.discordUnlinkFailed"),
						tone: "error",
					}
				: { text: t("account.discordUnlinked"), tone: "success" },
		);
		await router.invalidate();
	};

	const textLink =
		"font-bold text-primary underline underline-offset-4 hover:text-primary-strong";

	return (
		<main className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
			<PageHeader title={t("account.title")} />
			{message && (
				<Alert tone={message.tone} className="mb-6">
					{message.text}
				</Alert>
			)}
			<Section
				id="account-avatar"
				title={t("account.avatarTitle")}
				description={t("account.avatarDescription")}
			>
				<AvatarUploader
					endpoint="/api/me/avatar"
					name={summary.name}
					currentUrl={summary.avatarUrl}
					hasUploaded={summary.hasUploadedAvatar}
					removeLabel={
						summary.discordAccountId
							? t("account.avatarResetToDiscord")
							: t("account.avatarRemove")
					}
					onChanged={() => router.invalidate()}
				/>
			</Section>
			<Section id="account-email" title={t("account.emailTitle")}>
				<p className="text-sm leading-relaxed text-ink">
					<span className="font-bold break-all">{summary.email}</span>
					<span className="text-ink-muted">{t("account.emailNote")}</span>
				</p>
			</Section>
			<Section
				id="account-language"
				title={t("account.languageTitle")}
				description={t("account.languageDescription")}
			>
				<label htmlFor="account-language-select" className="sr-only">
					{t("account.languageTitle")}
				</label>
				<select
					id="account-language-select"
					value={user.locale ?? ""}
					onChange={async (event) => {
						const value = event.target.value;
						await setLocale({
							data: { locale: isLocale(value) ? value : null },
						});
						window.location.reload();
					}}
					className="control w-full sm:max-w-xs"
				>
					<option value="">{t("account.languageAuto")}</option>
					{LOCALES.map((value) => (
						<option key={value} value={value} lang={value}>
							{LOCALE_NAMES[value]}
						</option>
					))}
				</select>
			</Section>
			<Section
				id="account-discord"
				title="Discord"
				description={
					<>
						{/* 訳文の {more} の位置に「くわしく」のリンクを置く */}
						{t("account.discordDescription")
							.split("{more}")
							.flatMap((part, index) =>
								index === 0
									? [part]
									: [
											<a
												key={index}
												href="/help/discord-server"
												className={textLink}
											>
												{t("orgs.learnMore")}
											</a>,
											part,
										],
							)}
					</>
				}
			>
				{!summary.discordConfigured ? (
					<p className="text-sm text-ink-muted">
						{t("account.discordNotConfigured")}
					</p>
				) : summary.discordAccountId ? (
					<div className="flex flex-wrap items-center gap-3 text-sm">
						<Badge tone="primary">{t("account.discordLinkedBadge")}</Badge>
						<span className="text-ink-muted">
							{t("account.discordCanSignIn")}
						</span>
						<Button variant="ghost" size="sm" onClick={unlink} disabled={busy}>
							{t("account.discordUnlink")}
						</Button>
					</div>
				) : (
					<div className="space-y-3 text-sm">
						<p className="max-w-prose leading-relaxed text-ink">
							{t("account.discordLinkIntro")}
						</p>
						<Button onClick={link} disabled={busy}>
							<DiscordMark />
							{t("account.discordLink")}
						</Button>
					</div>
				)}
			</Section>
		</main>
	);
}
