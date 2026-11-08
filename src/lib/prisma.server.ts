import { platform } from "#platform";
import type { Database } from "./database";
import { inRequestScope, requestScoped } from "./request-scope.server";

export type { Database } from "./database";

// 開発中は HMR のたびにモジュールが読み直されるので、接続を globalThis に置いて使い回す
const globalForPrisma = globalThis as unknown as {
	prisma?: Database;
};

const sharedDatabase = (): Database => {
	const database = globalForPrisma.prisma ?? platform.createDatabase();
	if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = database;
	return database;
};

const DATABASE = Symbol("database");

/**
 * モデルの定義（DB につながずに読めるもの）。Better Auth は起動するとき（リクエストの外のことがある）に
 * これを読んで、スキーマを確かめる。読むだけなら接続は作られないので、リクエストの外でも作ってよい
 */
const METADATA_PROPERTIES = new Set<PropertyKey>(["_runtimeDataModel"]);
let metadataClient: Database | undefined;

/**
 * リクエストごとに接続を作る場所（Workers の Hyperdrive）では、prisma.user.findMany() のように
 * 使った時点で、そのリクエストの接続（なければ作る）に取り次ぐ。呼び出す側は、どちらでも同じに書ける
 */
const requestScopedDatabase = (): Database =>
	new Proxy({} as Database, {
		get(_target, property) {
			if (!inRequestScope() && METADATA_PROPERTIES.has(property)) {
				metadataClient ??= platform.createDatabase();
				return Reflect.get(metadataClient, property, metadataClient);
			}
			const database = requestScoped(DATABASE, () => platform.createDatabase());
			const value: unknown = Reflect.get(database, property, database);
			return typeof value === "function" ? value.bind(database) : value;
		},
	});

export const prisma: Database =
	platform.databaseScope === "request"
		? requestScopedDatabase()
		: sharedDatabase();
