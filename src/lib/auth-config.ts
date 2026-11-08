// ログインの設定のうち、環境変数から決まるもの（テストできるよう、Better Auth から切り離す）

export type DiscordConfig = { clientId: string; clientSecret: string };

/** Discord ログインは、Client ID と Secret の両方があるときだけ有効にする（片方だけならエラー） */
export const resolveDiscordConfig = (env: {
	DISCORD_CLIENT_ID?: string;
	DISCORD_CLIENT_SECRET?: string;
}): DiscordConfig | undefined => {
	const clientId = env.DISCORD_CLIENT_ID?.trim();
	const clientSecret = env.DISCORD_CLIENT_SECRET?.trim();
	if (!clientId && !clientSecret) return undefined;
	if (!clientId || !clientSecret) {
		throw new Error(
			"Discord ログインには DISCORD_CLIENT_ID と DISCORD_CLIENT_SECRET の両方が必要です",
		);
	}
	return { clientId, clientSecret };
};

/** 画面に出すログイン方法（どの方法を見せるか） */
export type LoginMethods = { email: true; discord: boolean };
