// 名前（アカウントの名前・団体ごとの表示名）の決まり。画面とサーバーの両方で使う
import { z } from "zod";

export const NAME_MAX_LENGTH = 50;

export const nameSchema = z
	.string()
	.trim()
	.min(1, "名前を入力してください")
	.max(NAME_MAX_LENGTH, `名前は ${NAME_MAX_LENGTH} 文字までにしてください`);

/** メールアドレスから、名前の入力欄の初期値を作る（@ より前） */
export const suggestNameFromEmail = (email: string): string =>
	email.split("@")[0]?.slice(0, NAME_MAX_LENGTH) ?? "";
