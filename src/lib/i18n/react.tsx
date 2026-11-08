// 画面でメッセージを引く。ルートで <I18nProvider locale> を置き、部品では useT() を使う
//
//   const t = useT();
//   <h1>{t("board.title")}</h1>
//   <p>{t("board.staffCount", { count: 3 })}</p>
import { createContext, useContext, useMemo } from "react";
import type { ReactNode } from "react";
import { DEFAULT_LOCALE, INTL_LOCALES, type Locale } from "./locales";
import { type Translate, translatorFor } from "./translate";

const LocaleContext = createContext<Locale>(DEFAULT_LOCALE);

export const I18nProvider = ({
	locale,
	children,
}: {
	locale: Locale;
	children: ReactNode;
}) => (
	<LocaleContext.Provider value={locale}>{children}</LocaleContext.Provider>
);

export const useLocale = (): Locale => useContext(LocaleContext);

export const useT = (): Translate => {
	const locale = useLocale();
	return useMemo(() => translatorFor(locale), [locale]);
};

/** 日付・数の書き方に使う Intl のロケール（ja-JP など） */
export const useIntlLocale = (): string => INTL_LOCALES[useLocale()];
