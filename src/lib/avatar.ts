// アイコンの URL。他のメンバーのブラウザが読み込むので、Discord の CDN のものだけを通す。
// user.image は本人が Better Auth の updateUser で好きな URL に書き換えられるため、
// そのまま出すと、一覧を開いた人の IP アドレスなどを外のサーバーに知らせてしまう
const AVATAR_ORIGIN = "https://cdn.discordapp.com";

/** Discord の CDN の https の URL なら、そのまま返す。それ以外は null */
export const safeAvatarUrl = (
	url: string | null | undefined,
): string | null => {
	if (!url) return null;
	try {
		const parsed = new URL(url);
		return parsed.origin === AVATAR_ORIGIN ? parsed.href : null;
	} catch {
		return null;
	}
};

/** アイコンの決め方：メンバーに保存したアイコン（Discord サーバーでのアイコン・Discord のアイコン）→ アカウントの画像 */
export const resolveAvatarUrl = (
	member:
		| {
				avatarUrl?: string | null;
				user?: { image?: string | null } | null;
		  }
		| null
		| undefined,
): string | null =>
	safeAvatarUrl(member?.avatarUrl) ?? safeAvatarUrl(member?.user?.image);
