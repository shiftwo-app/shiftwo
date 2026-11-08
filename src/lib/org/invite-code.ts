// 招待コード。8 文字で、読み間違えやすい文字（0 と O、1 と I と L）は使わない

export const INVITE_CODE_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
export const INVITE_CODE_LENGTH = 8;
export const INVITE_DEFAULT_EXPIRES_DAYS = 7;
export const INVITE_MAX_EXPIRES_DAYS = 30;
/** 使える回数の既定（1 回きり）。発行するときに変えられる */
export const INVITE_DEFAULT_MAX_USES = 1;
export const INVITE_MAX_USES_LIMIT = 500;

/** ランダムな招待コードを作る（暗号論的に安全な乱数を使う） */
export const generateInviteCode = (
	randomValues: (length: number) => ArrayLike<number> = (length) =>
		crypto.getRandomValues(new Uint32Array(length)),
): string => {
	const values = Array.from(randomValues(INVITE_CODE_LENGTH));
	let code = "";
	for (const value of values) {
		code += INVITE_CODE_ALPHABET[value % INVITE_CODE_ALPHABET.length];
	}
	return code;
};

/** 入力された招待コードをそろえる（小文字・空白・ハイフンを許す） */
export const normalizeInviteCode = (input: string): string =>
	input.toUpperCase().replace(/[\s-]/g, "");

/** 見せるときは 4 文字ずつ区切る（ABCD-EFGH） */
export const formatInviteCode = (code: string): string =>
	code.length === INVITE_CODE_LENGTH
		? `${code.slice(0, 4)}-${code.slice(4)}`
		: code;

export const isWellFormedInviteCode = (code: string): boolean =>
	new RegExp(`^[${INVITE_CODE_ALPHABET}]{${INVITE_CODE_LENGTH}}$`).test(code);

export type InviteState = {
	expiresAt: Date;
	revokedAt: Date | null;
	maxUses: number | null;
	uses: number;
};

export type InviteUnusableReason = "revoked" | "expired" | "used_up";

/** 招待コードが使えるかを調べる。使えなければ理由を返す */
export const inviteUnusableReason = (
	invite: InviteState,
	now: Date = new Date(),
): InviteUnusableReason | null => {
	if (invite.revokedAt) return "revoked";
	if (invite.expiresAt.getTime() <= now.getTime()) return "expired";
	if (invite.maxUses !== null && invite.uses >= invite.maxUses)
		return "used_up";
	return null;
};

export const INVITE_UNUSABLE_MESSAGES: Record<InviteUnusableReason, string> = {
	revoked: "この招待コードは取り消されています",
	expired: "この招待コードは期限が切れています",
	used_up: "この招待コードは使える回数を使い切っています",
};
