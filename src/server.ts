// サーバーの入口（TanStack Start が src/server.ts を自動で使う）。Node でも Cloudflare Workers でも同じ。
// リクエストごとの入れ物（src/lib/request-scope.server.ts）を作ってから、TanStack Start に渡す
import handler, { createServerEntry } from "@tanstack/react-start/server-entry";
import { localeOfRequest } from "./lib/i18n/locales";
import { setRequestLocale } from "./lib/i18n/request-locale.server";
import { runInRequestScope } from "./lib/request-scope.server";

// Workers で使う Durable Object のクラス（Node では何もない）
export * from "#worker-exports";

export default createServerEntry({
	fetch(request, ...rest) {
		return runInRequestScope(() => {
			// このリクエストの言語（Cookie で選んだもの、なければブラウザの言語）
			setRequestLocale(localeOfRequest(request.headers));
			return handler.fetch(request, ...rest);
		});
	},
});
