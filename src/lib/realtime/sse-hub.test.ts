import { describe, expect, it } from "vite-plus/test";
import { createSseHub } from "./sse-hub.server";

const read = async (reader: ReadableStreamDefaultReader<Uint8Array>) => {
	const { value } = await reader.read();
	return new TextDecoder().decode(value);
};

describe("SSE の配り方（Node）", () => {
	it("同じチャンネルを見ている人にだけ届き、切れたら外れる", async () => {
		const hub = createSseHub();
		const abort = new AbortController();
		const response = await hub.subscribe(
			new Request("http://localhost/live", { signal: abort.signal }),
			"a",
		);
		expect(response.headers.get("content-type")).toMatch(/text\/event-stream/);
		const reader = response.body!.getReader();
		expect(await read(reader)).toContain(": connected");

		await hub.publish("b", "ほかのチャンネル");
		await hub.publish("a", '{"type":"shift.changed"}');
		expect(await read(reader)).toBe('data: {"type":"shift.changed"}\n\n');

		expect(hub.listenerCount("a")).toBe(1);
		abort.abort();
		expect(hub.listenerCount("a")).toBe(0);
	});

	it("読む側が閉じても外れる", async () => {
		const hub = createSseHub();
		const response = await hub.subscribe(
			new Request("http://localhost/live"),
			"a",
		);
		await response.body!.cancel();
		expect(hub.listenerCount("a")).toBe(0);
	});
});
