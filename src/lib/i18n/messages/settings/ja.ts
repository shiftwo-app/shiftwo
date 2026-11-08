// settings の画面のメッセージ（日本語が基準）
// 団体・テナント・イベントの設定、イベントの一覧、管理の部品（src/components/manage）、権限の名前、管理の操作のエラー
export default {
	// ---- 共通 ----
	failedShort: "できませんでした",
	create: "作る",
	color: "色",
	ownerLabel: "オーナー",
	noRoles: "ロールなし",
	roleSeparator: "・",
	sameAsTenant: "テナントと同じ",

	// ---- 団体の設定 ----
	orgSettingsTitle: "設定・メンバー",
	orgAvatarTitle: "この団体でのあなたのアイコン",
	orgAvatarDescription:
		"選ぶと、この団体でだけこのアイコンを使います（ほかの団体やアカウントのアイコンは変わりません）。",
	orgAvatarRemove: "アカウントのアイコンに戻す",
	orgPositionsTitle: "持ち場",
	orgPositionsDescription:
		"使わないときは、シフトを人と時間だけで組みます（持ち場の選択・持ち場別の表示・必要な人数・希望の持ち場を出しません）。団体の基本の設定で、テナントやイベントごとに変えられます。",
	displayNameTitle: "この団体でのあなたの表示名",
	displayNameLabel: "表示名",
	displayNameSubmit: "変える",
	membersTitle: "メンバー（{count} 人）",
	memberYou: "（あなた）",
	removeMember: "外す",
	memberRolesLegend: "{name}のロール",
	roleNotToggleable: "自分が持っていない権限を含むので、付け外しできません",
	permissionNotOwned: "自分が持っていない権限は付けられません",
	roleName: "ロール名",
	roleMemberCount: "{count} 人",
	roleLocked: "自分が持っていない権限を含むので、変えられません",
	roleCreate: "ロールを作る",
	rolesTitle: "ロール",
	rolesDescription:
		"ロールごとに権限を決めます。1 人が複数のロールを持て、権限は足し合わせになります。オーナーは常に全権限です。 自分が持っていない権限は、ロールに付けたり人に渡したりできません。",
	newRole: "新しいロール",
	invitesTitle: "招待コード",
	inviteRole: "参加したときに付けるロール",
	inviteMaxUses: "使える回数",
	inviteUnlimited: "制限なし",
	inviteExpiresDays: "有効期限（日）",
	inviteIssue: "発行する",
	invitesEmpty: "まだ招待コードはありません。",
	inviteUses: "{uses}/{max} 回",
	inviteRevoked: "取り消し済み",
	inviteExpired: "期限切れ",
	inviteUsedUp: "使い切り",
	inviteUntil: "{date} まで",
	inviteCopied: "コピーしました",
	inviteCopyLink: "参加用のリンクをコピー",
	inviteRevoke: "取り消す",

	// ---- Discord サーバー ----
	discordTitle: "Discord サーバー",
	// {link} の所に「くわしく」のリンクが入る
	discordDescription:
		"サーバーを指定すると、そのサーバーのメンバーだけが参加し、シフトを見られます。ゲストのロールなど、 免除の権限があるロールの人は、メンバーでなくても参加できます（{link}）。",
	discordLearnMore: "くわしく",
	discordNotConfigured: "このシフトヲでは、Discord の連携は使えません。",
	discordCurrent: "今の設定",
	// {name} の所にサーバー名（太字）が入る
	discordMembersOnly: "{name} のメンバーだけ",
	discordNoConditionCurrent: "条件なし（招待コードがあれば誰でも参加できます）",
	// {link} の所に「アカウントの設定」のリンクが入る
	discordLinkFirst:
		"サーバーを選ぶには、先に{link}で Discord を連携してください。",
	discordAccountSettings: "アカウントの設定",
	discordGuildsError:
		"Discord からサーバーの一覧を読めませんでした。時間をおくか、Discord を連携し直してください。",
	discordServer: "サーバー",
	discordNoCondition: "条件なし",
	discordNote:
		"選べるのは、あなたが参加しているサーバーだけです。指定すると、今いるメンバーも次のログインから確かめます。",

	// ---- 持ち場を使うか ----
	positionsToggleTitle: "持ち場を使うか",
	positionsToggleDescription:
		"使わないときは、シフトを人と時間だけで組みます（持ち場の選択・持ち場別の表示・必要な人数・希望の持ち場を出しません）。",
	positionsOn: "使う",
	positionsOff: "使わない",
	positionsInheritDefault: "上と同じ",
	positionsInheritOption: "{label}（{value}）",
	sameAsOrg: "団体と同じ",

	// ---- テナント ----
	tenantsTitle: "テナント（{count}）",
	tenantsDescription:
		"店舗など、シフトを組む単位です。日常シフトの持ち場やイベントは、テナントごとに持ちます。",
	tenantSettingsLink: "設定",
	tenantCreate: "テナントを作る（店舗など）",
	tenantSettingsTitle: "テナントの設定",
	tenantSection: "テナント",
	tenantPositionsTitle: "日常シフトの持ち場",
	tenantPositionsDescription:
		"イベントの持ち場は、イベントの設定で別に決めます。",
	tenantPositionsUnused:
		"このテナントでは持ち場を使っていません。使うようにすると、ここで決めた持ち場を使えます。",
	tenantRolesTitle: "このテナントでのロールの割り当て",
	tenantRolesDescription:
		"ここで割り当てたロールの、シフトに関わる権限（シフトの閲覧・編集・確定、持ち場・イベントの管理）が、このテナントとその下のイベントで上乗せされます（店長など）。",
	tenantNoPermission: "このテナントの設定を変える権限がありません。",

	// ---- イベント ----
	eventsTitle: "イベント",
	eventsDescription:
		"単発のイベントのシフトは、日常シフトとは別に、イベントごとの持ち場で組みます。",
	eventsListTitle: "イベントの一覧（{count}）",
	eventsEmpty: "まだイベントはありません。",
	eventsCreate: "イベントを作る",
	eventSettingsTitle: "イベントの設定",
	eventSection: "イベント",
	eventPositionsTitle: "このイベントの持ち場",
	eventPositionsDescription: "日常シフトの持ち場とは別に持ちます。",
	eventPositionsUnused:
		"このイベントでは持ち場を使っていません。使うようにすると、ここで決めた持ち場を使えます。",
	eventRolesTitle: "このイベントでのロールの割り当て",
	eventRolesDescription:
		"ここで割り当てたロールの、シフトに関わる権限が、このイベントだけで上乗せされます。",
	eventDeleteTitle: "イベントを消す",
	eventDeleteDescription:
		"イベントの持ち場とシフトも消えます。元に戻せません。",
	eventDelete: "このイベントを消す",
	eventDeleteConfirm: "本当に消す（イベントの持ち場とシフトも消えます）",
	eventNoPermission: "このイベントの設定を変える権限がありません。",

	// ---- テナント・イベントのフォーム ----
	tenantName: "テナント名",
	eventName: "イベント名",
	urlName: "URL 名",
	urlNameHint: "（半角の英小文字・数字・ハイフン）",
	timeUnit: "時間粒度",
	minutes: "{minutes} 分",

	// ---- 持ち場 ----
	positionName: "持ち場の名前",
	positionNamePlaceholder: "持ち場の名前（例：受付）",
	requiredStaffCount: "必要な人数",
	positionCreate: "持ち場を作る",
	positionDeleteConfirm: "本当に消す（この持ち場のシフトも消えます）",
	positionsEmpty: "まだ持ち場はありません。",

	// ---- テナント・イベントでのロールの割り当て ----
	ownerAllPermissions: "オーナー（常に全権限）",
	scopedRolesLegend: "{name}に割り当てるロール",
	roleNotAssignable: "自分が持っていない権限を含むので、割り当てできません",

	// ---- スタッフ ----
	staffTitle: "スタッフ（{count}）",
	staffDescription:
		"シフトに入る人です。団体のメンバー（アカウント）と紐づけておくと、アイコンなどに使えます。",
	staffName: "スタッフの名前",
	staffLinkedMember: "紐づくメンバー",
	staffNoLink: "紐づけない",
	staffShiftCount: "シフト {count} 件",
	staffAdd: "スタッフを足す",
	staffDeleteConfirm: "本当に消す（シフト {count} 件も消えます）",

	// ---- 権限の名前 ----
	permShiftView: "シフトを見る",
	permShiftEdit: "シフトを作る・変える・消す",
	permShiftConfirm: "シフトを確定する",
	permPositionManage: "持ち場を作る・変える",
	permEventManage: "イベントを作る・設定する",
	permStaffManage: "スタッフを作る・変える",
	permMemberView: "メンバーを見る",
	permInviteManage: "招待コードを発行・取り消す",
	permInviteGuest:
		"ゲストを招待する（Discord サーバーの参加条件の免除を含むロールの招待コードを発行できる）",
	permMemberManage: "メンバーのロールを変える・外す",
	permRoleManage: "ロールを作る・変える",
	permTenantManage: "テナントを作る・設定する",
	permOrgSettings: "団体の設定を変える",
	permGuildBypass: "Discord サーバーの参加条件を免除する（ゲスト向け）",

	// ---- 入力の決まり（manage-schemas.ts） ----
	timeUnitInvalid: "時間粒度は 5・10・15・30 分のどれかにしてください",
	tenantNameRequired: "テナント名を入力してください",
	tenantNameTooLong: "テナント名は 80 文字までにしてください",
	eventNameRequired: "イベント名を入力してください",
	eventNameTooLong: "イベント名は 80 文字までにしてください",
	positionNameRequired: "持ち場の名前を入力してください",
	positionNameTooLong: "持ち場の名前は 40 文字までにしてください",
	colorInvalid: "色は #RRGGBB の形で指定してください",
	requiredCountInteger: "必要な人数は整数にしてください",
	requiredCountMin: "必要な人数は 0 人以上にしてください",
	requiredCountMax: "必要な人数は 99 人までにしてください",

	// ---- 管理の操作のエラー（サーバー） ----
	errorSlugTaken: "この URL はすでに使われています",
	errorTenantNotFound: "テナントが見つかりません",
	errorEventNotFound: "イベントが見つかりません",
	errorPositionNotFound: "持ち場が見つかりません",
	errorMemberNotFound: "メンバーが見つかりません",
	errorStaffNotFound: "スタッフが見つかりません",
	errorRoleNotFound: "ロールが見つかりません",
	errorStaffMemberTaken: "このメンバーは、すでにほかのスタッフに紐づいています",
	errorScopedRoleForbidden:
		"自分が持っていない権限を含むロールは、付けたり外したりできません",
	errorLinkForbidden: "メンバーと紐づけるには、メンバーを見る権限が必要です",
	errorOrgPositionsInherit: "団体では、使うか使わないかを選んでください",
} as const;
