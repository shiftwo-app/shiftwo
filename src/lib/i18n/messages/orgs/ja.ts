// orgs の画面のメッセージ（日本語が基準）
export default {
	listTitle: "団体",
	create: "団体を作る",
	joinWithCode: "招待コードで参加",
	emptyTitle: "まだどの団体にも所属していません",
	emptyBody: "団体を作るか、招待コードで参加してください。",
	suspendedBadge: "Discord サーバーの条件で見られません",
	createFailed: "作れませんでした。時間をおいて、もう一度試してください",
	newBasicsTitle: "団体",
	newBasicsDescription: "団体の名前と、団体のページの URL を決めます。",
	nameLabel: "団体名",
	nameHint: "例：技術カンファレンス 2026 運営",
	slugLabel: "URL",
	slugHint: "/o/ のあとに付く名前。半角の英小文字・数字・ハイフン",
	newYouTitle: "あなた",
	newYouDescription: "団体の中では、この名前で表示されます。",
	displayNameLabel: "この団体でのあなたの表示名",
	createSubmit: "作る",
	nameRequired: "団体名を入力してください",
	nameTooLong: "団体名は 80 文字までにしてください",
	slugTooShort: "URL は 3 文字以上にしてください",
	slugTooLong: "URL は 32 文字までにしてください",
	slugInvalid:
		"URL は半角の英小文字・数字・ハイフンだけで、ハイフンで始めたり終えたりしないでください",
	slugReserved: "この URL は使えません",
	slugTaken: "この URL はすでに使われています",
	inviteRevoked: "この招待コードは取り消されています",
	inviteExpired: "この招待コードは期限が切れています",
	inviteUsedUp: "この招待コードは使える回数を使い切っています",
	joinNotFound: "招待コードが見つかりません。入力を確かめてください",
	joinAlreadyMember: "すでにこの団体のメンバーです",
	joinDiscordRequired:
		"この団体に参加するには、Discord の連携が必要です。アカウントの設定で Discord を連携してから、もう一度試してください",
	joinNotInGuild:
		"この団体の Discord サーバーのメンバーではありません。サーバーに参加してから、もう一度試してください",
	joinDiscordUnavailable:
		"Discord に確かめられませんでした。時間をおいて、もう一度試してください",
	inviteCodeLabel: "招待コード（8 文字）",
	joinCheck: "確かめる",
	joinConfirm:
		"「{org}」に ロール「{role}」で参加します（招待コード {code}）。",
	joinGuildRequired:
		"この団体は、Discord サーバー「{guild}」のメンバーだけが参加できます。Discord を連携し、そのサーバーに参加している必要があります（{more}）。",
	learnMore: "くわしく",
	joinSubmit: "参加する",
	joinReenterCode: "コードを入れ直す",
	suspendedPageTitle: "見られません",
	suspendedBadgeNow: "今は見られません",
	suspendedBody:
		"この団体は、Discord サーバー「{guild}」のメンバーだけが見られます。サーバーを抜けたか、Discord の連携が切れているため、今は見られません。メンバーの情報は残っているので、サーバーに戻れば、また見られるようになります。",
	suspendedGuildFallback: "指定のサーバー",
	suspendedRecheck: "もう一度確かめる",
	suspendedRecheckFailed:
		"まだサーバーのメンバーであることを確かめられませんでした。サーバーに参加しているか、Discord の連携が切れていないかを確かめてください",
	suspendedAccountLink: "アカウントの設定（Discord の連携）",
	listSeparator: "・",
	discordHelpPageTitle: "Discord サーバーで参加を絞る",
	discordHelpHomeLinkLabel: "シフトヲ（トップへ）",
	discordHelpLabel: "ヘルプ",
	discordHelpTitle: "Discord サーバーで団体への参加を絞る",
	discordHelpIntro:
		"団体の設定で Discord サーバーを 1 つ指定すると、**そのサーバーのメンバーだけ**が団体に参加し、シフトを見られるようになります。運営チームの Discord サーバーを指定しておけば、招待コードが外に漏れても、チームの外の人は参加できません。",
	discordHelpOwnerTitle: "団体のオーナー・管理する人がすること",
	discordHelpOwnerStep1:
		"[アカウントの設定]で Discord を連携します（Discord でログインしていれば、すでに連携されています）",
	discordHelpOwnerStep2:
		"団体の「設定・メンバー」→「Discord サーバー」で、参加の条件にするサーバーを選びます。選べるのは、**自分が参加しているサーバー**だけです",
	discordHelpOwnerStep3: "いつもどおり招待コードを発行して、メンバーに渡します",
	discordHelpOwnerNote:
		"この設定を変えられるのは、「団体の設定を変える」権限を持つ人（オーナー・マネージャーなど）です。",
	discordHelpJoinerTitle: "参加する人がすること",
	discordHelpJoinerStep1:
		"Discord でログインするか、メールでログインしてから、アカウントの設定で Discord を連携します",
	discordHelpJoinerStep2: "団体の Discord サーバーに参加しておきます",
	discordHelpJoinerStep3:
		"招待コードを入力して参加します。このとき、サーバーのメンバーかどうかを確かめます",
	discordHelpLeaveTitle: "サーバーを抜けたとき",
	discordHelpLeaveBody1:
		"サーバーのメンバーかどうかは、**参加するときと、ログインのたび**に確かめます。サーバーを抜けた人や、Discord の連携を外した人は、その団体を見られなくなります。メンバーの情報（表示名やロール）は残るので、サーバーに戻れば、次のログインか「もう一度確かめる」でまた見られます。",
	discordHelpLeaveBody2:
		"Discord が一時的に応答しないときは、それまでの状態のままにします（Discord の不調で、全員が締め出されることはありません）。",
	discordHelpGuestTitle: "ゲスト（サーバーに入っていない協力者）",
	discordHelpGuestBody1:
		"外部の協力者など、サーバーに入っていない人にも参加してもらいたいときは、**ゲスト**のロールの招待コードを渡します。ゲストのロールには「Discord サーバーの参加条件を免除する」権限が付いていて、サーバーのメンバーでなくても参加でき、できることはスタッフと同じです。",
	discordHelpGuestBody2:
		"ゲストの招待コードを発行できるのは、「ゲストを招待する」権限を持つ人（オーナー・マネージャー・リーダーなど）です。どのロールに免除を付けるかは、団体の「ロール」で変えられます。オーナーは常に免除されます。",
	discordHelpAvatarTitle: "アイコン",
	discordHelpAvatarBody:
		"Discord を連携している人は、Discord のアイコンが一覧などに出ます。団体が Discord サーバーを指定していれば、**そのサーバーで設定しているアイコン**（サーバープロフィール）を使います。連携していない人は、名前の頭文字が出ます。",
	discordHelpDataTitle: "Discord から読む情報",
	discordHelpDataItem1:
		"ユーザー名・アイコン・メールアドレス（ログインのため）",
	discordHelpDataItem2:
		"参加しているサーバーの一覧（参加の条件にするサーバーを選ぶため）",
	discordHelpDataItem3:
		"サーバーでのプロフィール（そのサーバーのメンバーかどうかと、サーバーでのアイコン）",
	discordHelpDataNote:
		"メッセージやチャンネルの内容は読みません。Discord に何かを書き込むこともありません。",
} as const;
