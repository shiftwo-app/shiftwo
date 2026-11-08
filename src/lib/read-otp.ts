/**
 * URL の確認コードを文字列で読む。TanStack Router は URL のパラメータを JSON として読むので、
 * 「897935」は数値になる。先頭が 0 のコード（「012345」）は JSON の数値として読めず文字列のまま残るので、
 * 数値を文字列に戻しても桁は失われない
 */
export const readOtp = (value: unknown): string => {
	if (typeof value === "string") return value;
	if (typeof value === "number" && Number.isInteger(value))
		return String(value);
	return "";
};
