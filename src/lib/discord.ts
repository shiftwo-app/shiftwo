// Discord のアイコンの URL など（純粋な関数。画面とサーバーの両方で使う）
// https://discord.com/developers/docs/reference#image-formatting

const CDN = "https://cdn.discordapp.com";

const ext = (hash: string) => (hash.startsWith("a_") ? "gif" : "png");

/** ユーザーのアイコン（なければ null） */
export const discordUserAvatarUrl = (
	userId: string,
	avatar: string | null | undefined,
) =>
	avatar ? `${CDN}/avatars/${userId}/${avatar}.${ext(avatar)}?size=128` : null;

/** サーバーごとのプロフィールのアイコン（なければ null） */
export const discordGuildMemberAvatarUrl = (
	guildId: string,
	userId: string,
	avatar: string | null | undefined,
) =>
	avatar
		? `${CDN}/guilds/${guildId}/users/${userId}/avatars/${avatar}.${ext(avatar)}?size=128`
		: null;

/** サーバーのアイコン（なければ null） */
export const discordGuildIconUrl = (
	guildId: string,
	icon: string | null | undefined,
) => (icon ? `${CDN}/icons/${guildId}/${icon}.${ext(icon)}?size=64` : null);

const graphemes = new Intl.Segmenter("ja", { granularity: "grapheme" });

/** 名前の頭文字（アイコンがないときに出す。絵文字なども 1 文字として扱う） */
export const initialsOf = (name: string) => {
	const first = graphemes.segment(name.trim())[Symbol.iterator]().next();
	return first.done ? "?" : first.value.segment.toUpperCase();
};
