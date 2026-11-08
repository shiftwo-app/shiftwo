import { createFileRoute } from "@tanstack/react-router";
import { createMcpHandler } from "@modelcontextprotocol/server";
import { withMcpAuth } from "../../server/mcp-auth.server";
import { createShiftwoMcpServer } from "../../server/mcp-tools.server";

// MCP（AI のアシスタントからシフトヲを使う）のつなぎ先。OAuth のアクセストークン（Bearer）が要る。
// リクエストごとに、トークンの持ち主として動く MCP サーバーを作る（状態は持たない）
const handler = withMcpAuth(async (request, principal) => {
	const mcp = createMcpHandler(() => createShiftwoMcpServer(principal), {
		onerror: (error) =>
			console.error("MCP のリクエストを処理できませんでした", error),
	});
	return mcp.fetch(request, {
		authInfo: {
			token: principal.token,
			clientId: principal.clientId,
			scopes: [...principal.scopes],
			expiresAt: principal.expiresAt,
		},
	});
});

export const Route = createFileRoute("/api/mcp")({
	server: {
		handlers: {
			GET: ({ request }) => handler(request),
			POST: ({ request }) => handler(request),
			DELETE: ({ request }) => handler(request),
		},
	},
});
