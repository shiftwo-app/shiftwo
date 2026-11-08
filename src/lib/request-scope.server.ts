// リクエストごとの入れ物。src/server.ts がリクエストのたびに新しく作り、その処理の中（await の先も）から読める。
// Workers では、あるリクエストで作った I/O の部品（DB の接続など）を別のリクエストで使えないので、
// そういうものはここに置いて、リクエストごとに作り直す
import { AsyncLocalStorage } from "node:async_hooks";

const storage = new AsyncLocalStorage<Map<symbol, unknown>>();

/** リクエストの中なら true */
export const inRequestScope = (): boolean => storage.getStore() !== undefined;

export const runInRequestScope = <T>(fn: () => T): T =>
	storage.run(new Map(), fn);

/** このリクエストの key の値。まだなければ create で作って覚える。リクエストの外で呼ぶとエラー */
export const requestScoped = <T>(key: symbol, create: () => T): T => {
	const scope = storage.getStore();
	if (!scope) {
		throw new Error(
			`リクエストの外で ${key.description ?? "リクエストごとの値"} を使おうとしました`,
		);
	}
	if (!scope.has(key)) scope.set(key, create());
	return scope.get(key) as T;
};
