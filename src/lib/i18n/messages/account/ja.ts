// account の画面のメッセージ（日本語が基準）
export default {
	title: "アカウント",
	discordLinked: "Discord と連携しました",
	discordUnlinkFailed:
		"連携を外せませんでした。時間をおいて、もう一度試してください",
	discordUnlinked: "Discord の連携を外しました",
	avatarTitle: "アイコン",
	avatarDescription:
		"一覧やシフト表に出ます。団体ごとに別のアイコンにもできます（団体の「設定・メンバー」から）。",
	avatarResetToDiscord: "Discord のアイコンに戻す",
	avatarRemove: "アイコンをやめる",
	avatarUnreadable: "この画像は読み込めませんでした",
	avatarTooLarge: "画像が大きすぎます",
	avatarWrongType: "PNG・JPEG・WebP の画像を選んでください",
	avatarChanged: "アイコンを変えました",
	avatarChoose: "画像を選ぶ",
	avatarRemoved: "アップロードしたアイコンをやめました",
	emailTitle: "メールアドレス",
	emailNote: "（確認コードでいつでもログインできます）",
	discordDescription:
		"連携すると、Discord のユーザー名・アイコン・メールアドレス、参加しているサーバーの一覧、サーバーでのプロフィール（メンバーかどうかとアイコン）を読みます（{more}）。",
	discordNotConfigured: "このシフトヲでは、Discord の連携は使えません。",
	discordLinkedBadge: "連携しています",
	discordCanSignIn: "Discord でもログインできます",
	discordUnlink: "連携を外す",
	discordLinkIntro:
		"Discord を連携すると、Discord でもログインでき、Discord のアイコンが使われます。Discord サーバーのメンバーだけが参加できる団体にも参加できるようになります。",
	discordLink: "Discord と連携する",
	nameRequired: "名前を入力してください",
	nameTooLong: "名前は {max} 文字までにしてください",
	languageTitle: "言語",
	languageDescription:
		"画面と、あなたに届くメール（ログインのメールなど）の言語です。",
	languageAuto: "ブラウザに合わせる",
} as const;
