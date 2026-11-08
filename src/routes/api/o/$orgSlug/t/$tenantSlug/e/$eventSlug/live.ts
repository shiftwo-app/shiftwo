import { createFileRoute } from "@tanstack/react-router";
import { liveHandler } from "../../../../../../../../server/shift-api.server";

type Params = { orgSlug: string; tenantSlug: string; eventSlug: string };

// イベントのシフトの変更を受け取る（同時編集。Node は SSE、Cloudflare は WebSocket）
export const Route = createFileRoute(
	"/api/o/$orgSlug/t/$tenantSlug/e/$eventSlug/live",
)({
	server: {
		handlers: {
			GET: liveHandler<Params>(),
		},
	},
});
