// デスクトップのサイドバーを開いたまま固定するか（FR-3-4）。ブラウザごとの好みなので Cookie に覚える。
// サーバーで描くときにも読んで、読み込んだときに幅が変わらないようにする（ハイドレーションでずれない）
import { createIsomorphicFn } from "@tanstack/react-start";
import { getRequestSidebarPinned } from "./sidebar-pref.server";

export const SIDEBAR_COOKIE = "shiftwo-sidebar";

/** Cookie の文字列（Cookie ヘッダーか document.cookie）から、固定しているかを読む */
export const sidebarPinnedFromCookie = (cookie: string | null): boolean =>
	(cookie ?? "")
		.split(";")
		.some((part) => part.trim() === `${SIDEBAR_COOKIE}=pinned`);

export const getSidebarPinned = createIsomorphicFn()
	.server((): boolean => getRequestSidebarPinned())
	.client((): boolean => sidebarPinnedFromCookie(document.cookie));

/** 固定するかを覚える（1 年） */
export const rememberSidebarPinned = (pinned: boolean): void => {
	document.cookie = pinned
		? `${SIDEBAR_COOKIE}=pinned; Path=/; Max-Age=31536000; SameSite=Lax`
		: `${SIDEBAR_COOKIE}=; Path=/; Max-Age=0; SameSite=Lax`;
};
