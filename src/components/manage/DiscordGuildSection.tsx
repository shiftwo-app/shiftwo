import { useServerFn } from "@tanstack/react-start";
import { useCallback, useEffect, useId, useState } from "react";
import {
	getDiscordGuildSettings,
	setDiscordGuild,
} from "../../server/discord.functions";
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
		<section className="space-y-3">
			<h2 className="text-lg font-semibold">Discord サーバー</h2>
			<p className="text-sm text-gray-600">
				サーバーを指定すると、そのサーバーのメンバーだけが参加し、シフトを見られます。ゲストのロールなど、
				免除の権限があるロールの人は、メンバーでなくても参加できます（
				<a href="/help/discord-server" className="underline">
					くわしく
				</a>
				）。
			</p>
			{!settings ? (
				<p className="text-sm text-gray-500">読み込んでいます…</p>
			) : !settings.discordConfigured ? (
				<p className="text-sm text-gray-600">
					この shiftwo では、Discord の連携は使えません。
				</p>
			) : (
				<div className="space-y-2 text-sm">
					<p className="flex items-center gap-2">
						今の設定：
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
								<strong>{settings.current.name}</strong> のメンバーだけ
							</>
						) : (
							<strong>条件なし（招待コードがあれば誰でも参加できます）</strong>
						)}
					</p>
					{!settings.linked ? (
						<p>
							サーバーを選ぶには、先に
							<a href="/account" className="underline">
								アカウントの設定
							</a>
							で Discord を連携してください。
						</p>
					) : settings.guilds === null ? (
						<p className="text-red-700">
							Discord
							からサーバーの一覧を読めませんでした。時間をおくか、Discord
							を連携し直してください。
						</p>
					) : (
						<div className="flex flex-wrap items-center gap-2">
							<label htmlFor={`${id}-guild`} className="sr-only">
								サーバー
							</label>
							<select
								id={`${id}-guild`}
								value={selected}
								onChange={(event) => setSelected(event.target.value)}
								className="rounded border px-2 py-1"
							>
								<option value="">条件なし</option>
								{settings.guilds.map((guild) => (
									<option key={guild.id} value={guild.id}>
										{guild.name}
									</option>
								))}
							</select>
							<button
								type="button"
								onClick={() => void apply(selected || null)}
								className="rounded bg-blue-600 px-3 py-1 font-semibold text-white"
							>
								保存
							</button>
						</div>
					)}
					<p className="text-xs text-gray-500">
						選べるのは、あなたが参加しているサーバーだけです。指定すると、今いるメンバーも次のログインから確かめます。
					</p>
				</div>
			)}
		</section>
	);
};

export default DiscordGuildSection;
