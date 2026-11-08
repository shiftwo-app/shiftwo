// Cloudflare R2 に保存する BlobStore（STORAGE_DRIVER=r2。Cloudflare 向けの build で使う）
import type { BlobStore } from "./blob-store";
import { isSafeBlobKey } from "./blob-store";

/** R2 の binding のうち、使うところだけ（テストでは差し替える） */
export type R2BucketLike = {
	put(
		key: string,
		value: Uint8Array,
		options?: { httpMetadata?: { contentType?: string } },
	): Promise<unknown>;
	get(key: string): Promise<{
		arrayBuffer(): Promise<ArrayBuffer>;
		httpMetadata?: { contentType?: string };
	} | null>;
	delete(key: string): Promise<void>;
};

const assertSafeKey = (key: string) => {
	if (!isSafeBlobKey(key)) throw new Error(`Invalid blob key: ${key}`);
};

export const createR2BlobStore = (bucket: R2BucketLike): BlobStore => ({
	async put(key, body, contentType) {
		assertSafeKey(key);
		await bucket.put(key, body, { httpMetadata: { contentType } });
	},
	async get(key) {
		assertSafeKey(key);
		const object = await bucket.get(key);
		if (!object) return null;
		return {
			body: new Uint8Array(await object.arrayBuffer()),
			contentType:
				object.httpMetadata?.contentType ?? "application/octet-stream",
		};
	},
	async delete(key) {
		assertSafeKey(key);
		await bucket.delete(key);
	},
});
