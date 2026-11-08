// Better Auth に渡す Prisma。Postgres では、省ける文字列の配列（models.prisma の StringList?）を Json? で持つので、
// Better Auth が null を書くとき（「制限なし」の意味）は、Prisma の DbNull（SQL の NULL）に変える。
// Prisma は Json? に素の null を書かせないため。SQLite では JSON の文字列（String?）なので、そのまま渡す
import { DbNull } from "@prisma/client-runtime-utils";
import type { DatabaseProvider } from "./database-provider";
import type { Database } from "./prisma.server";

/** モデル（Prisma の client の名前）ごとの、省ける文字列の配列の項目。models.prisma の StringList? と合わせる */
export const OPTIONAL_STRING_LIST_FIELDS: Record<string, readonly string[]> = {
	oauthClient: [
		"scopes",
		"clientCredentialsScopes",
		"contacts",
		"postLogoutRedirectUris",
		"grantTypes",
		"responseTypes",
	],
	oauthResource: ["allowedScopes"],
	oauthRefreshToken: ["resources", "requestedUserInfoClaims"],
	oauthAccessToken: ["resources", "requestedUserInfoClaims"],
	oauthConsent: ["resources", "requestedUserInfoClaims"],
};

const WRITE_METHODS = new Set([
	"create",
	"createMany",
	"update",
	"updateMany",
	"upsert",
]);

const replaceNulls = (data: unknown, fields: readonly string[]): unknown => {
	if (Array.isArray(data)) return data.map((row) => replaceNulls(row, fields));
	if (!data || typeof data !== "object") return data;
	const copy: Record<string, unknown> = {
		...(data as Record<string, unknown>),
	};
	for (const field of fields) {
		if (copy[field] === null) copy[field] = DbNull;
	}
	return copy;
};

/** 書き込みの引数の data（upsert は create と update）の null を DbNull にする */
export const withDbNulls = (
	args: Record<string, unknown> | undefined,
	fields: readonly string[],
) => {
	if (!args) return args;
	const next = { ...args };
	for (const key of ["data", "create", "update"]) {
		if (key in next) next[key] = replaceNulls(next[key], fields);
	}
	return next;
};

export const authDatabase = (
	database: Database,
	provider: DatabaseProvider,
): Database => {
	if (provider !== "postgresql") return database;
	return new Proxy(database, {
		get(target, property, receiver) {
			const value: unknown = Reflect.get(target, property, receiver);
			const fields =
				typeof property === "string"
					? OPTIONAL_STRING_LIST_FIELDS[property]
					: undefined;
			if (!fields || !value || typeof value !== "object") return value;
			// モデルの delegate（prisma.oauthClient など）の書き込みだけを包む
			return new Proxy(value, {
				get(delegate, method, delegateReceiver) {
					const fn: unknown = Reflect.get(delegate, method, delegateReceiver);
					if (typeof fn !== "function" || !WRITE_METHODS.has(String(method))) {
						return fn;
					}
					return (args?: Record<string, unknown>) =>
						fn.call(delegate, withDbNulls(args, fields));
				},
			});
		},
	});
};
