// 名前（アカウントの名前・団体ごとの表示名）の決まり。画面とサーバーの両方で使う
import { z } from "zod";
import { getCurrentLocale } from "./i18n/current-locale";
import { translate } from "./i18n/translate";

export const NAME_MAX_LENGTH = 50;

export const nameSchema = z
	.string()
	.trim()
	// エラーの文は、確かめるときの言語にする（サーバーではリクエストの言語、画面では画面の言語）
	.min(1, {
		error: () => translate(getCurrentLocale(), "account.nameRequired"),
	})
	.max(NAME_MAX_LENGTH, {
		error: () =>
			translate(getCurrentLocale(), "account.nameTooLong", {
				max: NAME_MAX_LENGTH,
			}),
	});

/** メールアドレスから、名前の入力欄の初期値を作る（@ より前） */
export const suggestNameFromEmail = (email: string): string =>
	email.split("@")[0]?.slice(0, NAME_MAX_LENGTH) ?? "";
