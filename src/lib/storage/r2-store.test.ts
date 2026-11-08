import { describe, expect, it } from "vite-plus/test";
import type { R2BucketLike } from "./r2-store.server";
import { createR2BlobStore } from "./r2-store.server";

/** メモリに置く R2 の代わり */
const fakeBucket = () => {
	const objects = new Map<string, { body: Uint8Array; contentType?: string }>();
	const bucket: R2BucketLike = {
		async put(key, value, options) {
			objects.set(key, {
				body: value.slice(),
				contentType: options?.httpMetadata?.contentType,
			});
		},
		async get(key) {
			const object = objects.get(key);
			if (!object) return null;
			return {
				arrayBuffer: async () => object.body.slice().buffer,
				httpMetadata: { contentType: object.contentType },
			};
		},
		async delete(key) {
			objects.delete(key);
		},
	};
	return { bucket, objects };
};

describe("R2 の保存先", () => {
	it("置いたものを、種類ごと読み出せて、消せる", async () => {
		const { bucket } = fakeBucket();
		const store = createR2BlobStore(bucket);
		await store.put("avatars/a.webp", new Uint8Array([1, 2, 3]), "image/webp");
		expect(await store.get("avatars/a.webp")).toEqual({
			body: new Uint8Array([1, 2, 3]),
			contentType: "image/webp",
		});
		await store.delete("avatars/a.webp");
		expect(await store.get("avatars/a.webp")).toBeNull();
	});

	it("ないものは null、消してもエラーにしない", async () => {
		const store = createR2BlobStore(fakeBucket().bucket);
		expect(await store.get("avatars/none.png")).toBeNull();
		await expect(store.delete("avatars/none.png")).resolves.toBeUndefined();
	});

	it("「..」などを含む名前は、R2 に渡す前に断る", async () => {
		const { bucket, objects } = fakeBucket();
		const store = createR2BlobStore(bucket);
		await expect(
			store.put("../secret.png", new Uint8Array([1]), "image/png"),
		).rejects.toThrow();
		await expect(store.get("avatars/../x.png")).rejects.toThrow();
		expect(objects.size).toBe(0);
	});
});
