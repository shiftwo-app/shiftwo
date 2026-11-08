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
			{ title: "Shiftwo" },
		],
		links: [
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
		<main className="mx-auto max-w-md space-y-4 p-6">
			<h1 className="text-2xl font-bold">見つかりません</h1>
			<p className="text-sm">
				ページが見つからないか、見る権限がありません。団体のページなら、その団体に参加しているか確かめてください。
			</p>
			<a href="/" className="text-sm underline">
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
