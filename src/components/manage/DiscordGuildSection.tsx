import { useServerFn } from "@tanstack/react-start";
import { useCallback, useEffect, useId, useState } from "react";
import {
	getDiscordGuildSettings,
	setDiscordGuild,
} from "../../server/discord.functions";
import Alert from "../ui/Alert";
import Button from "../ui/Button";
import Section from "../ui/Section";
import type { RunMutation } from "./useMutationRunner";

type Settings = Awaited<ReturnType<typeof getDiscordGuildSettings>>;

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
			title="Discord サーバー"
			description={
				<>
					サーバーを指定すると、そのサーバーのメンバーだけが参加し、シフトを見られます。ゲストのロールなど、
					免除の権限があるロールの人は、メンバーでなくても参加できます（
					<a
						href="/help/discord-server"
						className="text-primary underline underline-offset-2 hover:text-primary-strong"
					>
						くわしく
					</a>
					）。
				</>
			}
		>
			{!settings ? (
				<p className="text-sm text-ink-muted">読み込んでいます…</p>
			) : !settings.discordConfigured ? (
				<p className="text-sm text-ink-muted">
					このシフトヲでは、Discord の連携は使えません。
				</p>
			) : (
				<div className="space-y-4 text-sm">
					<div className="rounded-lg border border-line bg-surface px-4 py-3">
						<p className="text-xs font-bold text-ink-muted">今の設定</p>
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
										<strong>{settings.current.name}</strong> のメンバーだけ
									</span>
								</>
							) : (
								<strong>
									条件なし（招待コードがあれば誰でも参加できます）
								</strong>
							)}
						</p>
					</div>
					{!settings.linked ? (
						<Alert tone="info">
							サーバーを選ぶには、先に
							<a
								href="/account"
								className="text-primary underline underline-offset-2 hover:text-primary-strong"
							>
								アカウントの設定
							</a>
							で Discord を連携してください。
						</Alert>
					) : settings.guilds === null ? (
						<Alert tone="error">
							Discord
							からサーバーの一覧を読めませんでした。時間をおくか、Discord
							を連携し直してください。
						</Alert>
					) : (
						<div className="flex flex-col gap-1">
							<label
								htmlFor={`${id}-guild`}
								className="text-sm font-bold text-ink"
							>
								サーバー
							</label>
							<div className="flex flex-wrap items-center gap-2">
								<select
									id={`${id}-guild`}
									value={selected}
									onChange={(event) => setSelected(event.target.value)}
									className="control min-w-0 flex-1 sm:max-w-xs"
								>
									<option value="">条件なし</option>
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
									保存
								</Button>
							</div>
						</div>
					)}
					<p className="text-xs leading-relaxed text-ink-muted">
						選べるのは、あなたが参加しているサーバーだけです。指定すると、今いるメンバーも次のログインから確かめます。
					</p>
				</div>
			)}
		</Section>
	);
};

export default DiscordGuildSection;
