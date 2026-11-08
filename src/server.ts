// サーバーの入口（TanStack Start が src/server.ts を自動で使う）。Node でも Cloudflare Workers でも同じ。
// リクエストごとの入れ物（src/lib/request-scope.server.ts）を作ってから、TanStack Start に渡す
import handler, { createServerEntry } from "@tanstack/react-start/server-entry";
import { runInRequestScope } from "./lib/request-scope.server";

export default createServerEntry({
	fetch(request, ...rest) {
		return runInRequestScope(() => handler.fetch(request, ...rest));
	},
});
