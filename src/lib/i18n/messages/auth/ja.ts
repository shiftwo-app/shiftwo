// auth の画面のメッセージ（日本語が基準）
export default {
	loginTitle: "シフトヲにログイン",
	loginSendLabel: "ログイン用のメールを送る",
	loginDiscordLabel: "Discord でログイン",
	signupTitle: "シフトヲに新規登録",
	signupSendLabel: "登録用のメールを送る",
	signupDiscordLabel: "Discord で登録",
	emailInvalid: "メールアドレスの形を確かめてください",
	emailSendFailed:
		"メールを送れませんでした。アドレスを確かめて、もう一度試してください",
	codeInvalid: "確認コードが違うか、期限が切れています",
	or: "または",
	emailLabel: "メールアドレス",
	codeSent:
		"{email} にメールを送りました。メールのリンクを開くか、確認コードを入力してください。",
	codeLabel: "確認コード（6 桁）",
	signIn: "ログイン",
	changeEmail: "アドレスを変える",
	resend: "もう一度送る",
	discordEmailNotVerified:
		"Discord のメールアドレスが確認されていません。Discord でメールアドレスを確認してから、もう一度試してください",
	discordLoginFailed:
		"ログインできませんでした。Discord のメールアドレスが確認済みか確かめて、もう一度試してください",
	signupPrompt: "はじめての方は",
	signupLink: "新規登録",
	loginPrompt: "アカウントをお持ちの方は",
	signupStepAccount:
		"Discord か、メールアドレス（確認コード）でアカウントを作ります",
	signupStepName: "名前を決めます",
	signupStepOrg: "団体を作るか、招待コードで団体に参加します",
	verifyLinkUnusable:
		"このリンクは使えません（期限切れか、使用済みです）。もう一度ログイン用のメールを送ってください",
	verifyLinkInvalid: "リンクが正しくありません。",
	verifyNotRequestedHere:
		"このブラウザからは、{email} にログイン用のメールを送っていません。",
	verifyNotYoursHint:
		"自分で送ったメールでなければ、このページを閉じてください（他人のアカウントにログインさせる手口の場合があります）。",
	verifyYoursHint:
		"自分で送った場合は、メールを送ったブラウザで確認コードを入力するか、このブラウザでログイン画面からやり直してください。",
	verifyAs: "{email} としてログインします。",
	verifySubmit: "ログインする",
	backToLogin: "ログイン画面へ",
	welcomePageTitle: "はじめに",
	welcomeTitle: "シフトヲへようこそ",
	welcomeBody:
		"{email} でアカウントを作りました。まず名前を決めてください。団体の中で使う表示名は、団体ごとにあとで変えられます。",
	nameLabel: "名前",
	welcomeSubmit: "はじめる",
	welcomeNext: "名前を決めたら、団体を作るか、招待コードで団体に参加します。",
	welcomeSwitchAccount: "別のアカウントでログインする（ログアウト）",
	loginEmailSubject: "{app} のログイン（確認コード {otp}）",
	loginEmailIntro: "{app} にログインするには、次のどちらかを使ってください。",
	loginEmailOpenLink: "■ リンクを開く",
	loginEmailEnterCode: "■ 確認コードを入力する",
	loginEmailExpires: "どちらも {minutes} 分で使えなくなります。",
	loginEmailIgnore: "心当たりがなければ、このメールは無視してください。",
} as const;
