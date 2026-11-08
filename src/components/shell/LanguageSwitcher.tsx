import { useServerFn } from "@tanstack/react-start";
import { useId } from "react";
import { LOCALE_NAMES, LOCALES, type Locale } from "../../lib/i18n/locales";
import { useLocale, useT } from "../../lib/i18n/react";
import { setLocaleFn } from "../../server/locale.functions";

/** 言語の切り替え。選んだら Cookie に覚えて、ページを読み直す（サーバーが描く文字も変わるように） */
const LanguageSwitcher = ({ className = "" }: { className?: string }) => {
	const id = useId();
	const t = useT();
	const locale = useLocale();
	const setLocale = useServerFn(setLocaleFn);
	return (
		<div className={`flex items-center gap-1.5 ${className}`}>
			<label htmlFor={id} className="sr-only">
				{t("common.language")}
			</label>
			<svg
				aria-hidden="true"
				viewBox="0 0 24 24"
				className="size-4 text-ink-muted"
				fill="none"
				stroke="currentColor"
				strokeWidth="1.8"
			>
				<circle cx="12" cy="12" r="9" />
				<path d="M3 12h18M12 3c2.5 2.7 2.5 15.3 0 18M12 3c-2.5 2.7-2.5 15.3 0 18" />
			</svg>
			<select
				id={id}
				value={locale}
				onChange={async (event) => {
					await setLocale({ data: { locale: event.target.value as Locale } });
					window.location.reload();
				}}
				className="rounded-md border-0 bg-transparent py-1 pr-6 pl-1 text-sm text-ink hover:bg-surface-sunken"
			>
				{LOCALES.map((value) => (
					<option key={value} value={value} lang={value}>
						{LOCALE_NAMES[value]}
					</option>
				))}
			</select>
		</div>
	);
};

export default LanguageSwitcher;
