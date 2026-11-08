import {
	createRootRoute,
	HeadContent,
	Outlet,
	Scripts,
} from "@tanstack/react-router";
import type { ReactNode } from "react";
import { getCurrentLocale } from "../lib/i18n/current-locale";
import { I18nProvider, useT } from "../lib/i18n/react";
import { translate } from "../lib/i18n/translate";
import styles from "../styles.css?url";

export const Route = createRootRoute({
	// 画面の言語（サーバーではリクエストの言語、画面ではサーバーが描いた <html lang>）
	beforeLoad: () => ({ locale: getCurrentLocale() }),
	head: ({ match }) => ({
		meta: [
			{ charSet: "utf-8" },
			{ name: "viewport", content: "width=device-width, initial-scale=1" },
			{ title: translate(match.context.locale, "common.appName") },
			// スマホのブラウザの上の帯の色（地の色にそろえる）
			{
				name: "theme-color",
				content: "#f5f7f8",
				media: "(prefers-color-scheme: light)",
			},
			{
				name: "theme-color",
				content: "#0f1720",
				media: "(prefers-color-scheme: dark)",
			},
		],
		links: [
			// 文字は BIZ UDP ゴシック（案内サイン向けの、読み間違えにくい UD 書体）
			{ rel: "preconnect", href: "https://fonts.googleapis.com" },
			{
				rel: "preconnect",
				href: "https://fonts.gstatic.com",
				crossOrigin: "anonymous",
			},
			{
				rel: "stylesheet",
				href: "https://fonts.googleapis.com/css2?family=BIZ+UDPGothic:wght@400;700&display=swap",
			},
			{ rel: "stylesheet", href: styles },
			{ rel: "icon", href: "/favicon.ico" },
		],
	}),
	component: RootComponent,
	notFoundComponent: NotFound,
});

// 見つからないとき（所属していない団体も、団体があるかどうかを漏らさないよう同じ表示にする）
function NotFound() {
	const t = useT();
	return (
		<main className="mx-auto max-w-md space-y-4 px-6 py-16">
			<p aria-hidden="true" className="text-5xl font-bold text-line-strong">
				404
			</p>
			<h1 className="text-2xl font-bold">{t("shell.notFoundTitle")}</h1>
			<p className="text-sm leading-relaxed text-ink-muted">
				{t("shell.notFoundBody")}
			</p>
			<a
				href="/"
				className="inline-block text-sm font-bold text-primary underline underline-offset-4"
			>
				{t("shell.notFoundBackHome")}
			</a>
		</main>
	);
}

function RootComponent() {
	return (
		<RootDocument>
			<Outlet />
		</RootDocument>
	);
}

function RootDocument({ children }: Readonly<{ children: ReactNode }>) {
	const { locale } = Route.useRouteContext();
	return (
		<html lang={locale}>
			<head>
				<HeadContent />
			</head>
			<body className="antialiased">
				<I18nProvider locale={locale}>{children}</I18nProvider>
				<Scripts />
			</body>
		</html>
	);
}
