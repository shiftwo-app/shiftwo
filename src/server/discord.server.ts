// Discord の API の呼び出し（サーバー専用）。テストできるよう fetch を差し替えられる。
// 使う権限（scope）：identify・email（ログイン）、guilds（参加しているサーバーの一覧）、
// guilds.members.read（サーバーでのプロフィール＝メンバーかどうかとサーバーでのアイコン）
import {
	discordGuildIconUrl,
	discordGuildMemberAvatarUrl,
	discordUserAvatarUrl,
} from "../lib/discord";
import { auth } from "../lib/auth.server";
import { prisma } from "../lib/prisma.server";

const API = "https://discord.com/api/v10";
type Fetch = typeof fetch;

export const DISCORD_SCOPES = [
	"identify",
	"email",
	"guilds",
	"guilds.members.read",
];

export type DiscordGuild = { id: string; name: string; iconUrl: string | null };

/** 参加しているサーバーの一覧。失敗したら null（トークンが使えない・通信の失敗など） */
export const fetchCurrentUserGuilds = async (
	accessToken: string,
	fetchImpl: Fetch = fetch,
): Promise<DiscordGuild[] | null> => {
	try {
		const res = await fetchImpl(`${API}/users/@me/guilds`, {
			headers: { Authorization: `Bearer ${accessToken}` },
		});
		if (!res.ok) return null;
		const body = (await res.json()) as {
			id: string;
			name: string;
			icon: string | null;
		}[];
		return body.map((g) => ({
			id: g.id,
			name: g.name,
			iconUrl: discordGuildIconUrl(g.id, g.icon),
		}));
	} catch {
		return null;
	}
};

export type GuildMemberResult =
	/** サーバーのメンバー。avatarUrl はサーバーでのアイコン、なければ Discord のアイコン */
	| { status: "member"; avatarUrl: string | null }
	/** メンバーではない */
	| { status: "not_member" }
	/** トークンが使えない（連携をやり直してもらう） */
	| { status: "unauthorized" }
	/** わからない（通信の失敗・混雑による制限など）。この結果で締め出したりはしない */
	| { status: "unknown" };

/** そのサーバーのメンバーかと、サーバーでのアイコンを調べる（guilds.members.read が要る） */
export const fetchGuildMember = async (
	accessToken: string,
	guildId: string,
	fetchImpl: Fetch = fetch,
): Promise<GuildMemberResult> => {
	try {
		const res = await fetchImpl(`${API}/users/@me/guilds/${guildId}/member`, {
			headers: { Authorization: `Bearer ${accessToken}` },
		});
		if (res.status === 404) return { status: "not_member" };
		if (res.status === 401 || res.status === 403)
			return { status: "unauthorized" };
		if (!res.ok) return { status: "unknown" };
		const body = (await res.json()) as {
			avatar?: string | null;
			user?: { id: string; avatar?: string | null };
		};
		const userId = body.user?.id;
		const avatarUrl = userId
			? (discordGuildMemberAvatarUrl(guildId, userId, body.avatar) ??
				discordUserAvatarUrl(userId, body.user?.avatar))
			: null;
		return { status: "member", avatarUrl };
	} catch {
		return { status: "unknown" };
	}
};

/** その人の Discord のアクセストークン（期限が切れていれば更新する）。連携していなければ null */
export const getDiscordAccessToken = async (
	userId: string,
): Promise<string | null> => {
	const account = await prisma.account.findFirst({
		where: { userId, providerId: "discord" },
		select: { id: true },
	});
	if (!account) return null;
	try {
		const token = await auth.api.getAccessToken({
			body: { accountId: account.id, userId },
		});
		return token?.accessToken ?? null;
	} catch {
		return null;
	}
};

export type GuildCheck =
	| { status: "member"; avatarUrl: string | null }
	| { status: "not_member" }
	/** Discord を連携していない・連携が切れている */
	| { status: "no_discord" }
	| { status: "unknown" };

/** その人が、そのサーバーのメンバーかを調べる */
export type GuildChecker = (
	userId: string,
	guildId: string,
) => Promise<GuildCheck>;

export const checkGuildMembership: GuildChecker = async (userId, guildId) => {
	const token = await getDiscordAccessToken(userId);
	if (!token) return { status: "no_discord" };
	const result = await fetchGuildMember(token, guildId);
	if (result.status === "unauthorized") return { status: "no_discord" };
	return result;
};
