// ログインのメールの文面。確認コードと、押すだけでログインできるリンクを 1 通に入れる。
// 文面の言語は、呼ぶ側（auth.server.ts）がリクエストの言語の t を渡して決める
import { type Translate, translatorFor } from "../i18n/translate";

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
	t = translatorFor("ja"),
}: {
	email: string;
	otp: string;
	link: string;
	appName?: string;
	/** 文面の言語（既定は日本語） */
	t?: Translate;
}) => ({
	to: email,
	subject: t("auth.loginEmailSubject", { app: appName, otp }),
	text: [
		t("auth.loginEmailIntro", { app: appName }),
		"",
		t("auth.loginEmailOpenLink"),
		link,
		"",
		t("auth.loginEmailEnterCode"),
		otp,
		"",
		t("auth.loginEmailExpires", { minutes: LOGIN_CODE_EXPIRES_MINUTES }),
		t("auth.loginEmailIgnore"),
	].join("\n"),
});
