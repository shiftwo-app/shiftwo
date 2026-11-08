// アイコンの URL。他のメンバーのブラウザが読み込むので、出してよいのは
// Discord の CDN の画像と、このアプリにアップロードされた画像（/api/avatars/...）だけ。
// user.image は本人が Better Auth の updateUser で好きな URL に書き換えられるため、
// そのまま出すと、一覧を開いた人の IP アドレスなどを外のサーバーに知らせてしまう
const DISCORD_CDN_ORIGIN = "https://cdn.discordapp.com";

/** アップロードしたアイコンのファイル名（保存先のキーの最後の部分）。uuid と拡張子 */
const UPLOADED_FILE =
	/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(png|jpg|webp)$/;
const UPLOADED_PATH = /^\/api\/avatars\/([^/]+)$/;

export const isUploadedAvatarFile = (file: string): boolean =>
	UPLOADED_FILE.test(file);

/** アップロードしたアイコンを返す URL（同じオリジン） */
export const uploadedAvatarUrl = (file: string): string =>
	`/api/avatars/${file}`;

/** 出してよい URL なら、そのまま返す。それ以外は null */
export const safeAvatarUrl = (
	url: string | null | undefined,
): string | null => {
	if (!url) return null;
	const uploaded = UPLOADED_PATH.exec(url);
	if (uploaded) return isUploadedAvatarFile(uploaded[1] ?? "") ? url : null;
	try {
		const parsed = new URL(url);
		return parsed.origin === DISCORD_CDN_ORIGIN ? parsed.href : null;
	} catch {
		return null;
	}
};

const fromUploaded = (file: string | null | undefined): string | null =>
	file && isUploadedAvatarFile(file) ? uploadedAvatarUrl(file) : null;

/**
 * アイコンの決め方。本人が選んだものを、Discord から自動でとったものより優先する。
 * 1. この団体でだけ使うアイコン（アップロード）
 * 2. アカウントのアイコン（アップロード）
 * 3. 団体の Discord サーバーでのアイコン（なければ Discord のアイコン。ログインのたびに更新）
 * 4. Discord のアイコン（Discord でログインしたときの画像）
 * どれもなければ null（画面では名前の頭文字）
 */
export const resolveAvatarUrl = (
	member:
		| {
				uploadedAvatarKey?: string | null;
				avatarUrl?: string | null;
				user?: {
					uploadedAvatarKey?: string | null;
					image?: string | null;
				} | null;
		  }
		| null
		| undefined,
): string | null =>
	fromUploaded(member?.uploadedAvatarKey) ??
	fromUploaded(member?.user?.uploadedAvatarKey) ??
	safeAvatarUrl(member?.avatarUrl) ??
	safeAvatarUrl(member?.user?.image);

/** resolveAvatarUrl に渡すために、メンバーから読む欄（Prisma の select） */
export const memberAvatarSelect = {
	uploadedAvatarKey: true,
	avatarUrl: true,
	user: { select: { uploadedAvatarKey: true, image: true } },
} as const;
