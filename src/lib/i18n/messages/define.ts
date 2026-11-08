// 名前空間のメッセージを、言語ごとにまとめる。日本語を基準にして、ほかの言語も同じキーをすべて持たせる
import type { Locale } from "../locales";

export type Messages<Base> = { readonly [K in keyof Base]: string };

export const defineNamespace = <Base extends Record<string, string>>(
	messages: { ja: Base } & { [L in Exclude<Locale, "ja">]: Messages<Base> },
) => messages;
