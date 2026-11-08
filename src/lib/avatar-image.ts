// アップロードされたアイコンの画像を確かめる（サーバーとブラウザの両方で使う）
export const AVATAR_MAX_BYTES = 512 * 1024;
/** ブラウザで切り抜いて縮める大きさ（正方形の一辺の px） */
export const AVATAR_SIZE = 256;

export type AvatarImageType = {
	contentType: string;
	ext: "png" | "jpg" | "webp";
};

const startsWith = (bytes: Uint8Array, signature: number[], offset = 0) =>
	signature.every((value, index) => bytes[offset + index] === value);

/**
 * 中身の先頭のバイト（マジックナンバー）から、PNG・JPEG・WebP のどれかを見分ける。
 * Content-Type やファイル名は送る側が自由に決められるので信じない。
 * SVG は中にスクリプトを書けるので受け付けない
 */
export const detectAvatarImageType = (
	bytes: Uint8Array,
): AvatarImageType | null => {
	if (startsWith(bytes, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) {
		return { contentType: "image/png", ext: "png" };
	}
	if (startsWith(bytes, [0xff, 0xd8, 0xff])) {
		return { contentType: "image/jpeg", ext: "jpg" };
	}
	// RIFF....WEBP
	if (
		startsWith(bytes, [0x52, 0x49, 0x46, 0x46]) &&
		startsWith(bytes, [0x57, 0x45, 0x42, 0x50], 8)
	) {
		return { contentType: "image/webp", ext: "webp" };
	}
	return null;
};
