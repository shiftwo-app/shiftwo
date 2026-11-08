// 変更を、同じものを見ている人に配る仕組み。動かす場所で中身が違う（#platform の realtime）
//   Node       … SSE（Server-Sent Events）。プロセスの中だけで配る（1 台で動かす前提）
//   Cloudflare … WebSocket。チャンネルごとの Durable Object が配る（Hibernation で、待っているあいだは休む）
export type RealtimeTransport = "sse" | "websocket";

export type Realtime = {
	/** 画面がつなぐ方式 */
	transport: RealtimeTransport;
	/** channel を見ている人全員に message を送る */
	publish(channel: string, message: string): Promise<void>;
	/** channel を見るための応答（SSE のストリームか、WebSocket の 101）。権限の確かめは呼ぶ側で済ませる */
	subscribe(request: Request, channel: string): Response | Promise<Response>;
};
