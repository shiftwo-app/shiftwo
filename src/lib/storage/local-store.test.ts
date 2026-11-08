import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, describe, expect, it } from "vite-plus/test";
import { isSafeBlobKey } from "./blob-store";
import { createLocalBlobStore } from "./local-store.server";

describe("isSafeBlobKey", () => {
	it("ディレクトリをさかのぼるキーや絶対パスは通さない", () => {
		expect(isSafeBlobKey("avatars/1aa4fead-237e.webp")).toBe(true);
		for (const key of [
			"../x.png",
			"avatars/../../x.png",
			"/etc/passwd",
			"a//b.png",
			"avatars/x",
		]) {
			expect(isSafeBlobKey(key), key).toBe(false);
		}
	});
});

describe("createLocalBlobStore", async () => {
	const root = await mkdtemp(join(tmpdir(), "shiftwo-store-"));
	const store = createLocalBlobStore(root);
	afterAll(() => rm(root, { recursive: true, force: true }));

	it("保存して読み出し、消せる。ないものは null", async () => {
		await store.put(
			"avatars/a-b.webp",
			new Uint8Array([1, 2, 3]),
			"image/webp",
		);
		expect(await store.get("avatars/a-b.webp")).toEqual({
			body: new Uint8Array([1, 2, 3]),
			contentType: "image/webp",
		});
		await store.delete("avatars/a-b.webp");
		expect(await store.get("avatars/a-b.webp")).toBeNull();
		await expect(store.delete("avatars/a-b.webp")).resolves.toBeUndefined();
	});

	it("おかしなキーはエラーにする", async () => {
		await expect(store.get("../escape.png")).rejects.toThrow();
	});
});
