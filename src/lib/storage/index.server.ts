// 保存先を選ぶ。STORAGE_DRIVER を読んで、動かす場所（#platform）に合うものを作る
// （Node は local、Cloudflare は r2）
import { platform } from "#platform";
import type { BlobStore } from "./blob-store";

let store: BlobStore | undefined;

export const getBlobStore = (): BlobStore => {
	store ??= platform.createBlobStore();
	return store;
};
