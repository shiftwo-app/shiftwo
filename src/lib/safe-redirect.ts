/**
 * ログイン後の戻り先として使ってよいパスだけを返す（オープンリダイレクト対策）。
 * 同じサイトの中のパス（/ で始まり、// や /\ で始まらない）だけを許し、それ以外は fallback
 */
export const safeRedirectPath = (value: unknown, fallback = "/"): string => {
	if (typeof value !== "string") return fallback;
	if (
		!value.startsWith("/") ||
		value.startsWith("//") ||
		value.startsWith("/\\")
	) {
		return fallback;
	}
	// 制御文字（改行など。U+0000〜U+001F と U+007F）が入っていれば使わない
	for (const char of value) {
		const code = char.charCodeAt(0);
		if (code <= 0x1f || code === 0x7f) return fallback;
	}
	return value;
};
