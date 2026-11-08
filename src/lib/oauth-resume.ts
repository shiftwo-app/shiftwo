// MCP のクライアントが OAuth の認可を始めたとき、ログインしていなければ Better Auth（oauth-provider）は
// /login に、認可のリクエストの中身を署名付きのクエリ（sig・exp など）で付けて送ってくる。
// ログインしたら、そのリクエストをもう一度 /api/auth/oauth2/authorize に送り直して、続き（同意の画面）に進める

/** 署名のためにだけ付くもの。送り直すときは外す（prompt=login のままだと、またログインの画面に戻ってしまう） */
const SIGNATURE_PARAMS = new Set([
	"sig",
	"exp",
	"ba_iat",
	"ba_param",
	"ba_pl",
	"prompt",
]);

export const OAUTH_AUTHORIZE_PATH = "/api/auth/oauth2/authorize";

/**
 * /login などのクエリ（TanStack Router が読んだもの）から、ログインのあとに戻る認可の URL（パス）を作る。
 * 認可の途中でなければ（sig がなければ）null
 */
export const oauthResumePath = (
	search: Record<string, unknown>,
): string | null => {
	if (typeof search.sig !== "string" || typeof search.client_id !== "string") {
		return null;
	}
	const params = new URLSearchParams();
	for (const [key, value] of Object.entries(search)) {
		if (SIGNATURE_PARAMS.has(key) || key === "redirect" || key === "error") {
			continue;
		}
		for (const item of Array.isArray(value) ? value : [value]) {
			if (item === undefined || item === null) continue;
			params.append(
				key,
				typeof item === "object" ? JSON.stringify(item) : String(item),
			);
		}
	}
	return `${OAUTH_AUTHORIZE_PATH}?${params.toString()}`;
};

/** アプリの画面ではなく、サーバーが答えるパス（ページを読み込み直して移る） */
export const isServerPath = (path: string) => path.startsWith("/api/");

/** ログインなどのあとに移る。サーバーのパスなら、ページを読み込み直して移る */
export const goTo = (
	router: { history: { push: (path: string) => void } },
	path: string,
) => {
	if (isServerPath(path)) window.location.assign(path);
	else router.history.push(path);
};
