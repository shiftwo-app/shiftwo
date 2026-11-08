// errors の画面のメッセージ（日本語が基準）
export default {
	saveFailed: "保存できませんでした。時間をおいて、もう一度試してください",
	failedShort: "できませんでした",
	forbiddenGrant:
		"自分が持っていない権限を含むロールは、付けたり渡したりできません",
	roleConcurrentChange:
		"ほかの人が同時にこのロールを変えました。画面を読み直して、もう一度試してください",
	roleNotFound: "ロールが見つかりません",
	roleUpdateForbidden: "自分が持っていない権限を含むロールは変えられません",
	roleDeleteForbidden: "自分が持っていない権限を含むロールは消せません",
	memberNotFound: "メンバーが見つかりません",
	ownerRolesFixed:
		"オーナーのロールは変えられません（オーナーは常に全権限です）",
	orgNotFound: "団体が見つかりません",
	ownerCannotBeRemoved: "オーナーは外せません",
	memberRemoveForbidden: "自分が持っていない権限を持つメンバーは外せません",
	roleNameRequired: "ロール名を入力してください",
	roleNameTooLong: "ロール名は 40 文字までにしてください",
	roleColorInvalid: "色は #RRGGBB の形で指定してください",
	discordLinkFirst: "先にアカウントの設定で Discord を連携してください",
	discordGuildNotFound:
		"そのサーバーが見つかりません（自分が参加しているサーバーだけ選べます）",
} as const;
