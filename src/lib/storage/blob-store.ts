// アップロードしたファイル（今はアイコンだけ）の保存先。デプロイ先ごとに中身を差し替える。
// Node（セルフホスト・開発）はディスク、Cloudflare は R2 を使う
export type StoredBlob = { body: Uint8Array<ArrayBuffer>; contentType: string };

export interface BlobStore {
	put(key: string, body: Uint8Array, contentType: string): Promise<void>;
	/** なければ null */
	get(key: string): Promise<StoredBlob | null>;
	/** なくてもエラーにしない */
	delete(key: string): Promise<void>;
}

/** キーに使ってよい文字（ディレクトリをさかのぼる「..」や絶対パスを作らせない） */
export const isSafeBlobKey = (key: string): boolean =>
	/^[a-z0-9-]+(\/[a-z0-9-]+)*\.[a-z0-9]+$/.test(key);
