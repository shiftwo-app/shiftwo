import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { mcpResourceUrl } from "../lib/mcp-config";
import { requireUserMiddleware } from "./auth-middleware";
import {
	disconnectApp,
	listConnectedApps,
	readConsentRequest,
} from "./oauth-apps.server";

// MCP のクライアント（AI のアシスタントのアプリ）とのつながり。どれもログインが必要

/** 同意の画面：どのアプリが何を求めているか（クエリの署名を確かめる。だめなら null） */
export const getConsentRequestFn = createServerFn({ method: "GET" })
	.middleware([requireUserMiddleware])
	.validator((data: { oauthQuery: string }) =>
		z.object({ oauthQuery: z.string().max(8000) }).parse(data),
	)
	.handler(({ data }) => readConsentRequest(data.oauthQuery));

/** アカウントの設定：つないだアプリの一覧 */
export const listConnectedAppsFn = createServerFn({ method: "GET" })
	.middleware([requireUserMiddleware])
	.handler(async ({ context }) => ({
		apps: await listConnectedApps(context.user.id),
		/** AI のアシスタントに登録する、つなぎ先の URL */
		mcpUrl: mcpResourceUrl(process.env.BETTER_AUTH_URL),
	}));

/** アカウントの設定：アプリとのつながりを切る */
export const disconnectAppFn = createServerFn({ method: "POST" })
	.middleware([requireUserMiddleware])
	.validator((data: { clientId: string }) =>
		z.object({ clientId: z.string().min(1).max(500) }).parse(data),
	)
	.handler(async ({ data, context }) => {
		await disconnectApp(context.user.id, data.clientId);
		return { ok: true as const };
	});
