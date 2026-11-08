// Node 用：SSE で配る。購読はプロセスのメモリに持つので、Node を複数台で動かすときは別の仕組みが要る
import type { Realtime } from "./types";

type Listener = (message: string) => void;

/** 何もないまま接続が切られないように、ときどき送るコメント */
const HEARTBEAT_MS = 25_000;

export const createSseHub = (
	heartbeatMs = HEARTBEAT_MS,
): Realtime & {
	/** テスト用：channel を見ている数 */
	listenerCount(channel: string): number;
} => {
	const channels = new Map<string, Set<Listener>>();

	const add = (channel: string, listener: Listener) => {
		let set = channels.get(channel);
		if (!set) {
			set = new Set();
			channels.set(channel, set);
		}
		set.add(listener);
	};
	const remove = (channel: string, listener: Listener) => {
		const set = channels.get(channel);
		set?.delete(listener);
		if (set?.size === 0) channels.delete(channel);
	};

	return {
		transport: "sse",
		async publish(channel, message) {
			for (const listener of channels.get(channel) ?? []) listener(message);
		},
		subscribe(request, channel) {
			const encoder = new TextEncoder();
			let cleanup = () => {};
			const stream = new ReadableStream<Uint8Array>({
				start(controller) {
					const send = (chunk: string) => {
						try {
							controller.enqueue(encoder.encode(chunk));
						} catch {
							cleanup(); // もう閉じている
						}
					};
					// SSE の data は 1 行ずつ送る（JSON に改行はないが、念のため）
					const listener: Listener = (message) =>
						send(
							`${message
								.split("\n")
								.map((line) => `data: ${line}`)
								.join("\n")}\n\n`,
						);
					add(channel, listener);
					const heartbeat = setInterval(() => send(": ping\n\n"), heartbeatMs);
					cleanup = () => {
						clearInterval(heartbeat);
						remove(channel, listener);
						cleanup = () => {};
						try {
							controller.close();
						} catch {
							// すでに閉じている
						}
					};
					request.signal.addEventListener("abort", () => cleanup(), {
						once: true,
					});
					// つながったらすぐ 1 行送る（プロキシが溜め込まずに流しはじめるように）。切れたら 3 秒でつなぎ直す
					send("retry: 3000\n: connected\n\n");
				},
				cancel() {
					cleanup();
				},
			});
			return new Response(stream, {
				headers: {
					"content-type": "text/event-stream; charset=utf-8",
					"cache-control": "no-cache, no-transform",
					// nginx などに溜め込ませない
					"x-accel-buffering": "no",
				},
			});
		},
		listenerCount(channel) {
			return channels.get(channel)?.size ?? 0;
		},
	};
};
