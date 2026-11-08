// 保存先を選ぶ。STORAGE_DRIVER（既定は local）。Cloudflare の R2 は、Cloudflare 向けの build で足す
import type { BlobStore } from "./blob-store";
import { createLocalBlobStore } from "./local-store.server";

let store: BlobStore | undefined;

export const getBlobStore = (): BlobStore => {
	if (store) return store;
	const driver = process.env.STORAGE_DRIVER || "local";
	if (driver !== "local") {
		throw new Error(`STORAGE_DRIVER must be "local" (got "${driver}")`);
	}
	store = createLocalBlobStore(process.env.STORAGE_DIR || "data/uploads");
	return store;
};
