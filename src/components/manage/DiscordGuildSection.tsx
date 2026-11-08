import { useServerFn } from "@tanstack/react-start";
import { useCallback, useEffect, useId, useState } from "react";
import type { ReactNode } from "react";
import {
	getDiscordGuildSettings,
	setDiscordGuild,
} from "../../server/discord.functions";
import Alert from "../ui/Alert";
import Button from "../ui/Button";
import Section from "../ui/Section";
import type { RunMutation } from "./useMutationRunner";
import { useT } from "../../lib/i18n/react";

type Settings = Awaited<ReturnType<typeof getDiscordGuildSettings>>;

/** メッセージの {link} などの所に、リンクなどの部品を差し込む */
const withSlot = (message: string, slot: string, node: ReactNode) => {
	const [before, after = ""] = message.split(slot);
	return (
		<>
			{before}
			{node}
			{after}
		</>
	);
};

/**
 * 団体の参加の条件にする Discord サーバーを選ぶ（団体の設定の権限）。
 * Discord のサーバーの一覧を読むのに時間がかかるので、表示されてから読み込む
 */
const DiscordGuildSection = ({
	orgSlug,
	run,
}: {
	orgSlug: string;
	run: RunMutation;
}) => {
	const load = useServerFn(getDiscordGuildSettings);
	const save = useServerFn(setDiscordGuild);
	const t = useT();
	const id = useId();
	const [settings, setSettings] = useState<Settings | null>(null);
	const [selected, setSelected] = useState("");

	const reload = useCallback(async () => {
		const next = await load({ data: { orgSlug } });
		setSettings(next);
		setSelected(next.current?.id ?? "");
	}, [load, orgSlug]);

	useEffect(() => {
		void reload();
	}, [reload]);

	const apply = async (guildId: string | null) => {
		const ok = await run(() => save({ data: { orgSlug, guildId } }));
		if (ok) await reload();
	};

	return (
		<Section
			id={`${id}-h`}
			title={t("settings.discordTitle")}
			description={withSlot(
				t("settings.discordDescription"),
				"{link}",
				<a
					href="/help/discord-server"
					className="text-primary underline underline-offset-2 hover:text-primary-strong"
				>
					{t("settings.discordLearnMore")}
				</a>,
			)}
		>
			{!settings ? (
				<p className="text-sm text-ink-muted">{t("common.loading")}</p>
			) : !settings.discordConfigured ? (
				<p className="text-sm text-ink-muted">
					{t("settings.discordNotConfigured")}
				</p>
			) : (
				<div className="space-y-4 text-sm">
					<div className="rounded-lg border border-line bg-surface px-4 py-3">
						<p className="text-xs font-bold text-ink-muted">
							{t("settings.discordCurrent")}
						</p>
						<p className="mt-1 flex flex-wrap items-center gap-2 text-ink">
							{settings.current ? (
								<>
									{settings.current.iconUrl && (
										<img
											src={settings.current.iconUrl}
											alt=""
											width={20}
											height={20}
											referrerPolicy="no-referrer"
											className="rounded"
										/>
									)}
									<span>
										{withSlot(
											t("settings.discordMembersOnly"),
											"{name}",
											<strong>{settings.current.name}</strong>,
										)}
									</span>
								</>
							) : (
								<strong>{t("settings.discordNoConditionCurrent")}</strong>
							)}
						</p>
					</div>
					{!settings.linked ? (
						<Alert tone="info">
							{withSlot(
								t("settings.discordLinkFirst"),
								"{link}",
								<a
									href="/account"
									className="text-primary underline underline-offset-2 hover:text-primary-strong"
								>
									{t("settings.discordAccountSettings")}
								</a>,
							)}
						</Alert>
					) : settings.guilds === null ? (
						<Alert tone="error">{t("settings.discordGuildsError")}</Alert>
					) : (
						<div className="flex flex-col gap-1">
							<label
								htmlFor={`${id}-guild`}
								className="text-sm font-bold text-ink"
							>
								{t("settings.discordServer")}
							</label>
							<div className="flex flex-wrap items-center gap-2">
								<select
									id={`${id}-guild`}
									value={selected}
									onChange={(event) => setSelected(event.target.value)}
									className="control min-w-0 flex-1 sm:max-w-xs"
								>
									<option value="">{t("settings.discordNoCondition")}</option>
									{settings.guilds.map((guild) => (
										<option key={guild.id} value={guild.id}>
											{guild.name}
										</option>
									))}
								</select>
								<Button
									variant="primary"
									onClick={() => void apply(selected || null)}
								>
									{t("common.save")}
								</Button>
							</div>
						</div>
					)}
					<p className="text-xs leading-relaxed text-ink-muted">
						{t("settings.discordNote")}
					</p>
				</div>
			)}
		</Section>
	);
};

export default DiscordGuildSection;
