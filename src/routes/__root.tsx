import {
	createRootRoute,
	HeadContent,
	Outlet,
	Scripts,
} from "@tanstack/react-router";
import type { ReactNode } from "react";
import styles from "../styles.css?url";

export const Route = createRootRoute({
	head: () => ({
		meta: [
			{ charSet: "utf-8" },
			{ name: "viewport", content: "width=device-width, initial-scale=1" },
			{ title: "シフトヲ" },
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
	return (
		<main className="mx-auto max-w-md space-y-4 px-6 py-16">
			<p aria-hidden="true" className="text-5xl font-bold text-line-strong">
				404
			</p>
			<h1 className="text-2xl font-bold">見つかりません</h1>
			<p className="text-sm leading-relaxed text-ink-muted">
				ページが見つからないか、見る権限がありません。団体のページなら、その団体に参加しているか確かめてください。
			</p>
			<a
				href="/"
				className="inline-block text-sm font-bold text-primary underline underline-offset-4"
			>
				トップへ
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
	return (
		<html lang="ja">
			<head>
				<HeadContent />
			</head>
			<body className="antialiased">
				{children}
				<Scripts />
			</body>
		</html>
	);
}
