// ログイン CSRF 対策：ログイン用のメールを送ったブラウザかどうかを Cookie で見分ける。
// 他人が自分のアドレスと確認コードを入れたリンクを送ってきても、押すだけでは
// その人のアカウントにログインしないようにする

export const LOGIN_REQUEST_COOKIE = "shiftwo_login_request";
export const LOGIN_REQUEST_MAX_AGE_SECONDS = 10 * 60;

/** Cookie に入れる・比べるときの形（前後の空白を取り、小文字にする） */
export const normalizeEmail = (email: string): string =>
	email.trim().toLowerCase();

/** リンクのアドレスが、このブラウザでメールを送ったアドレスと同じか */
export const isLoginRequestedHere = (
	cookieValue: string | undefined,
	email: string,
): boolean =>
	cookieValue !== undefined &&
	cookieValue !== "" &&
	cookieValue === normalizeEmail(email);
