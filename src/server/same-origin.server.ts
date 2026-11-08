// 書き込みの API（server route）を、よそのサイトからのリクエストで呼ばせない（CSRF の対策）。
// ブラウザは POST・DELETE の fetch に Origin を付けるので、このアプリのオリジンと一致するときだけ通す
export const isSameOriginRequest = (request: Request): boolean => {
	const origin = request.headers.get("origin");
	if (!origin) return false;
	const allowed = new Set([new URL(request.url).origin]);
	// リバースプロキシの後ろでは request.url が内側の URL になるので、公開している URL も認める
	if (process.env.BETTER_AUTH_URL) {
		allowed.add(new URL(process.env.BETTER_AUTH_URL).origin);
	}
	return allowed.has(origin);
};

export const forbiddenOrigin = () =>
	Response.json({ message: "Forbidden" }, { status: 403 });
