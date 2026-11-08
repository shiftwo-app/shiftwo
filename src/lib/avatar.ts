/** アイコンの決め方：メンバーに保存したアイコン（Discord サーバーでのアイコン・Discord のアイコン）→ アカウントの画像 */
export const resolveAvatarUrl = (
	member:
		| {
				avatarUrl?: string | null;
				user?: { image?: string | null } | null;
		  }
		| null
		| undefined,
): string | null => member?.avatarUrl ?? member?.user?.image ?? null;
