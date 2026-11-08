// メッセージの目録。画面の範囲（名前空間）ごとにファイルを分け、日本語（ja.ts）を基準にする。
// ほかの言語のファイルは、日本語と同じキーをすべて持つ（足りないと型エラーになる）。
// 名前空間を足すときは、ここの namespaces に足す
import account from "./account";
import auth from "./auth";
import board from "./board";
import common from "./common";
import errors from "./errors";
import orgs from "./orgs";
import preferences from "./preferences";
import report from "./report";
import settings from "./settings";
import shell from "./shell";

const namespaces = {
	common,
	shell,
	auth,
	account,
	orgs,
	board,
	settings,
	preferences,
	report,
	errors,
} as const;

type Namespaces = typeof namespaces;
type NamespaceName = Extract<keyof Namespaces, string>;

/** "名前空間.キー" の形のメッセージのキー */
export type MessageKey = {
	[N in NamespaceName]: `${N}.${keyof Namespaces[N]["ja"] & string}`;
}[NamespaceName];

type Catalog = Partial<Record<MessageKey, string>>;

const flatten = (locale: keyof Namespaces[NamespaceName]): Catalog => {
	const catalog: Record<string, string> = {};
	for (const [name, byLocale] of Object.entries(namespaces)) {
		for (const [key, value] of Object.entries(
			byLocale[locale as keyof typeof byLocale] as Record<string, string>,
		)) {
			catalog[`${name}.${key}`] = value;
		}
	}
	return catalog as Catalog;
};

export const catalogs = {
	ja: flatten("ja"),
	en: flatten("en"),
	"zh-Hans": flatten("zh-Hans"),
	"zh-Hant": flatten("zh-Hant"),
	ko: flatten("ko"),
};
