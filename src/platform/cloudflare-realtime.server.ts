// Cloudflare 用：WebSocket で配る。チャンネル（シフトの単位）ごとに Durable Object を 1 つ使う。
// Hibernation（ctx.acceptWebSocket）を使うので、だれも変えていないあいだは Durable Object が休み、料金がかからない
import { DurableObject, env } from "cloudflare:workers";
import type { Realtime } from "../lib/realtime/types";

/** チャンネル 1 つ分。つながっている WebSocket に、届いたメッセージを配る */
export class ShiftBoardRoom extends DurableObject {
	constructor(ctx: DurableObjectStateLike, envArg: unknown) {
		super(ctx, envArg);
		// ping には Durable Object を起こさずに pong を返す（つながっているかの確かめ）
		ctx.setWebSocketAutoResponse(
			new WebSocketRequestResponsePair("ping", "pong"),
		);
	}

	async fetch(request: Request): Promise<Response> {
		if (request.headers.get("upgrade")?.toLowerCase() !== "websocket") {
			return new Response("Expected WebSocket", { status: 426 });
		}
		const pair = new WebSocketPair();
		const [client, server] = [pair[0], pair[1]];
		this.ctx.acceptWebSocket(server);
		return new Response(null, {
			status: 101,
			webSocket: client,
		} as ResponseInit);
	}

	/** 変更を配る（Worker から RPC で呼ぶ） */
	async publish(message: string): Promise<void> {
		for (const socket of this.ctx.getWebSockets()) {
			try {
				socket.send(message);
			} catch {
				// 切れかけの接続は放っておく（閉じるときに webSocketClose が呼ばれる）
			}
		}
	}

	async webSocketClose(socket: WebSocket, code: number, reason: string) {
		try {
			socket.close(code, reason);
		} catch {
			// すでに閉じている
		}
	}
}

const rooms = () => {
	if (!env.SHIFT_BOARD_ROOMS) {
		throw new Error(
			"wrangler.jsonc に SHIFT_BOARD_ROOMS（Durable Object）の binding がありません",
		);
	}
	return env.SHIFT_BOARD_ROOMS;
};

const roomOf = (channel: string) => {
	const namespace = rooms();
	return namespace.get(namespace.idFromName(channel));
};

export const cloudflareRealtime: Realtime = {
	transport: "websocket",
	async publish(channel, message) {
		await roomOf(channel).publish(message);
	},
	subscribe(request, channel) {
		return roomOf(channel).fetch(request);
	},
};
