// board の画面のメッセージ（日本語が基準）
export default {
	// ルートの見出し
	titleRegular: "日常シフト",
	titleRegularDraft: "日常シフトの下書き",
	titleEvent: "イベントの確定シフト",
	titleEventDraft: "イベントの下書き",

	// ShiftBoardPage
	canEdit: "編集できます",
	viewOnly: "閲覧だけできます",
	timeUnitDescription: "時間は {minutes} 分きざみ",
	positionsDisabled: "持ち場は使っていません",
	descriptionSeparator: "・",
	noEventPositions: "このイベントの持ち場がまだありません。",
	noRegularPositions: "日常シフトの持ち場がまだありません。",

	// ShiftBoard
	liveConnecting: "接続中…",
	liveLive: "ほかの人の変更をすぐに反映します",
	liveOffline: "ほかの人の変更を受け取れていません（つなぎ直しています）",
	saveFailed: "保存できませんでした。時間をおいて、もう一度試してください",
	actionChangeTime: "時間の変更",
	actionDelete: "削除",
	actionCreate: "作成",
	undo: "元に戻す",
	undoWithAction: "元に戻す（{action}）",
	modeGroup: "操作モード",
	modeView: "閲覧",
	modeEdit: "編集",

	// ShiftForm
	formTitle: "シフトを作る",
	formStaff: "スタッフ",
	formPosition: "持ち場",
	formStart: "開始",
	formEnd: "終了",
	formPreferredPosition: "希望どおりの持ち場",
	formSubmit: "作る",
	formRequiredWithPosition:
		"スタッフ・持ち場・開始・終了をすべて入力してください",
	formRequired: "スタッフ・開始・終了をすべて入力してください",

	// ShiftTimeline
	timelineLabel: "シフトのタイムライン",
	axisPosition: "持ち場別",
	axisStaff: "スタッフ別",
	axisLegend: "縦軸",
	dayGroup: "日付",
	zoomLabel: "目盛り",
	zoomOption: "{minutes} 分",
	now: "いま",
	rowsLabel: "{axis}の行",
	rowShifts: "{label}のシフト",
	staffingLabel: "{label}の充足状況",
	staffingSegment: "{range}、{count} 人 / 必要 {required} 人",
	staffingShortSuffix: "、不足",
	staffingTitle: "{range}：{text}",
	timeRange: "{start}〜{end}",
	listSeparator: "、",
	unassignedRow: "持ち場なし",
	legendLabel: "凡例",
	legendDraft: "下書き",
	legendOverridden: "希望外の割り当て",
	legendShort: "人が足りない時間帯",
	legendNow: "いま",
	helpStaffing: "持ち場別の行の上の数字は「入っている人数 / 必要な人数」です。",
	helpZoom: "⌘ / Ctrl を押しながらホイール（ピンチ）でズームできます。",
	helpEditing:
		" 編集モードでは、シフトをドラッグで移動、右端のドラッグで長さを変えられます。キーボードでは ←→ で移動、Shift+←→ で長さ、Delete で削除です。",
	noteDraft: "下書き",
	noteOverridden: "希望外の割り当て",

	// サーバー（シフトの保存）
	errorTimeOrder: "終了時刻は開始時刻より後にしてください",
	errorStartUnit: "開始時刻は {minutes} 分単位で指定してください",
	errorEndUnit: "終了時刻は {minutes} 分単位で指定してください",
	errorShiftNotFound: "シフトが見つかりません",
	errorForbiddenEdit: "シフトを編集する権限がありません",
	errorForbiddenConfirm: "確定したシフトを扱う権限がありません",
	errorConflict:
		"ほかの人が先にこのシフトを変更しました。最新の内容を表示したので、もう一度操作してください",
	errorInvalidInput: "入力の形が正しくありません",
	errorPositionRequired: "持ち場を選んでください",
	errorStaffOrPositionMissing: "スタッフか持ち場が見つかりません",
	errorNotFound: "見つかりません",
} as const;
