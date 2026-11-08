// MCP（AI のアシスタントからシフトヲを使う）の、認可とつなぎ先の決まりごと

/** 読むだけの権限。見られる範囲は、その人がシフトヲの画面で見られる範囲と同じ */
export const MCP_SCOPE_READ = "shiftwo:read";
/** 書く権限（シフトを作る・変える・消す、希望を出す）。できることは、その人がシフトヲの画面でできることと同じ */
export const MCP_SCOPE_WRITE = "shiftwo:write";

/** 認可サーバーとして扱うスコープ（OIDC のものと、リフレッシュトークンのもの、シフトヲのもの） */
export const MCP_SCOPES = [
	"openid",
	"profile",
	"email",
	"offline_access",
	MCP_SCOPE_READ,
	MCP_SCOPE_WRITE,
] as const;

export const MCP_PATH = "/api/mcp";

/** MCP のつなぎ先（トークンの宛先でもある）。BETTER_AUTH_URL がなければ開発用の localhost */
export const mcpResourceUrl = (baseURL: string | undefined): string =>
	new URL(MCP_PATH, baseURL ?? "http://localhost:3000").toString();
