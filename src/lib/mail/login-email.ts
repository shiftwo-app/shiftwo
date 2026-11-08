// ログインのメールの文面。確認コードと、押すだけでログインできるリンクを 1 通に入れる

export const LOGIN_CODE_EXPIRES_MINUTES = 10;

/** メールのリンクの先（確認コードを自動で入れてログインするページ） */
export const buildLoginLink = (baseUrl: string, email: string, otp: string) => {
	const url = new URL("/login/verify", baseUrl);
	url.searchParams.set("email", email);
	url.searchParams.set("otp", otp);
	return url.toString();
};

export const buildLoginEmail = ({
	email,
	otp,
	link,
	appName = "shiftwo",
}: {
	email: string;
	otp: string;
	link: string;
	appName?: string;
}) => ({
	to: email,
	subject: `${appName} のログイン（確認コード ${otp}）`,
	text: [
		`${appName} にログインするには、次のどちらかを使ってください。`,
		"",
		"■ リンクを開く",
		link,
		"",
		"■ 確認コードを入力する",
		otp,
		"",
		`どちらも ${LOGIN_CODE_EXPIRES_MINUTES} 分で使えなくなります。`,
		"心当たりがなければ、このメールは無視してください。",
	].join("\n"),
});
