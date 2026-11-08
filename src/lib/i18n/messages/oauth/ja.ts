// AI のアシスタント（MCP）とのつながりの画面のメッセージ（日本語が基準）
export default {
	consentTitle: "{app} をシフトヲにつなぎますか？",
	consentLead:
		"つなぐと、このアプリ（AI のアシスタントなど）が、あなたとしてシフトヲを使えるようになります。見られるもの・できることは、あなたがシフトヲでできる範囲だけです。",
	consentApp: "アプリ",
	consentReturnsTo: "戻り先",
	consentReturnsToHint: "覚えのない戻り先なら、つながないでください",
	consentRead: "所属している団体・シフト・自分の希望を見る",
	consentWrite:
		"シフトを作る・変える・消す、自分の希望を出す（あなたの権限の範囲で）",
	consentWriteOptional: "変更も許す（外すと見るだけになります）",
	consentAllow: "つなぐ",
	consentDeny: "やめる",
	consentInvalid:
		"この同意の画面は使えません。期限が切れたか、つなごうとしたアプリが見つかりません。アプリからもう一度つないでください。",
	consentFailed: "つなげませんでした。もう一度お試しください。",
	pageTitle: "アプリをつなぐ",
	appsTitle: "つないだアプリ（AI のアシスタント）",
	appsDescription:
		"MCP で、AI のアシスタントからシフトヲを使えます。つなぐ先は {url} です。",
	appsNone: "つないだアプリはありません",
	appsCanWrite: "変更もできる",
	appsReadOnly: "見るだけ",
	appsConnectedAt: "{date} につないだ",
	appsDisconnect: "つながりを切る",
	appsDisconnected: "{app} とのつながりを切りました",
} as const;
