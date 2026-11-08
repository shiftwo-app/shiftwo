// サーバーでの、そのリクエストのサイドバーの固定（Cookie で選んだもの）。src/server.ts がリクエストのはじめに決める
import { inRequestScope, requestScoped } from "./request-scope.server";

const SIDEBAR_PINNED = Symbol("sidebarPinned");

export const setRequestSidebarPinned = (pinned: boolean): void => {
	requestScoped(SIDEBAR_PINNED, () => pinned);
};

export const getRequestSidebarPinned = (): boolean =>
	inRequestScope() ? requestScoped(SIDEBAR_PINNED, () => false) : false;
