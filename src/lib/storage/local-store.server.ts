// ディスクに保存する（Node：開発とセルフホスト）。STORAGE_DIR の下に、キーのとおりに置く
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { type BlobStore, isSafeBlobKey } from "./blob-store";

const CONTENT_TYPES: Record<string, string> = {
	png: "image/png",
	jpg: "image/jpeg",
	webp: "image/webp",
};

export const createLocalBlobStore = (root: string): BlobStore => {
	const base = resolve(root);
	const pathOf = (key: string) => {
		if (!isSafeBlobKey(key)) throw new Error(`Invalid blob key: ${key}`);
		return join(base, key);
	};
	return {
		async put(key, body) {
			const path = pathOf(key);
			await mkdir(dirname(path), { recursive: true });
			await writeFile(path, body);
		},
		async get(key) {
			try {
				const body = new Uint8Array(await readFile(pathOf(key)));
				const ext = key.slice(key.lastIndexOf(".") + 1);
				return {
					body,
					contentType: CONTENT_TYPES[ext] ?? "application/octet-stream",
				};
			} catch (error) {
				if ((error as NodeJS.ErrnoException).code === "ENOENT") return null;
				throw error;
			}
		},
		async delete(key) {
			await rm(pathOf(key), { force: true });
		},
	};
};
