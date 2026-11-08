// Cloudflare Workers の binding（wrangler.jsonc）の型。使うところだけを書く。
// @cloudflare/workers-types を全部読み込むと、ブラウザ（DOM）の型とぶつかるため
declare module "cloudflare:workers" {
	export const env: {
		DATABASE_PROVIDER?: string;
		/** DATABASE_PROVIDER=postgresql のとき */
		HYPERDRIVE?: { connectionString: string };
		/** DATABASE_PROVIDER=sqlite のとき（D1Database。型は @prisma/adapter-d1 に合わせて渡す） */
		DB?: object;
		/** STORAGE_DRIVER=r2 のとき */
		BUCKET?: import("../lib/storage/r2-store.server").R2BucketLike;
		/** MAIL_TRANSPORT=cloudflare のとき（Cloudflare Email Service） */
		EMAIL?: {
			send(message: {
				from: string | { name: string; email: string };
				to: string;
				subject: string;
				text?: string;
				html?: string;
			}): Promise<{ messageId: string }>;
		};
		/** 同時編集の変更を配る Durable Object（ShiftBoardRoom） */
		SHIFT_BOARD_ROOMS?: {
			idFromName(name: string): unknown;
			get(id: unknown): {
				fetch(request: Request): Promise<Response>;
				publish(message: string): Promise<void>;
			};
		};
		MAIL_FROM?: string;
		MAIL_FROM_NAME?: string;
		STORAGE_DRIVER?: string;
	};
	export function waitUntil(promise: Promise<unknown>): void;
	export abstract class DurableObject<Env = unknown> {
		protected ctx: DurableObjectStateLike;
		protected env: Env;
		constructor(ctx: DurableObjectStateLike, env: Env);
	}
}

/** Durable Object の state のうち、使うところだけ */
type DurableObjectStateLike = {
	acceptWebSocket(socket: WebSocket, tags?: string[]): void;
	getWebSockets(tag?: string): WebSocket[];
	setWebSocketAutoResponse(pair: WebSocketRequestResponsePair): void;
};
declare class WebSocketRequestResponsePair {
	constructor(request: string, response: string);
}
declare class WebSocketPair {
	0: WebSocket;
	1: WebSocket;
}
