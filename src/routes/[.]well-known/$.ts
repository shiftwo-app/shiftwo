import { createFileRoute } from "@tanstack/react-router";
import { auth } from "../../lib/auth.server";

// OAuth・MCP のクライアントが最初に読む案内（/.well-known/oauth-protected-resource/api/mcp、
// /.well-known/oauth-authorization-server/api/auth など）。中身は Better Auth（mcp プラグイン）が返す
export const Route = createFileRoute("/.well-known/$")({
	server: {
		handlers: {
			GET: ({ request }) => auth.handler(request),
		},
	},
});
