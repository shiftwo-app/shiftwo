// どの DB を使うか。Postgres（自前・Docker・Hyperdrive）と SQLite（Cloudflare D1）
export const DATABASE_PROVIDERS = ["postgresql", "sqlite"] as const;
export type DatabaseProvider = (typeof DATABASE_PROVIDERS)[number];

/** DATABASE_PROVIDER を読む。未設定なら postgresql、知らない値ならエラー */
export const parseDatabaseProvider = (
	value: string | undefined,
): DatabaseProvider => {
	if (value === undefined || value === "") return "postgresql";
	if ((DATABASE_PROVIDERS as readonly string[]).includes(value)) {
		return value as DatabaseProvider;
	}
	throw new Error(
		`DATABASE_PROVIDER must be one of ${DATABASE_PROVIDERS.join(", ")} (got "${value}")`,
	);
};
