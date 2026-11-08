import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../generated/prisma-postgresql/client";
import { parseDatabaseProvider } from "./database-provider";
import { loadEnvFileIfExists } from "./load-env";

loadEnvFileIfExists();

/**
 * アプリで使う Prisma Client の型。Postgres 用と SQLite（D1）用は同じモデル定義から作るので、
 * 呼び出し方は同じ。型は Postgres 用のものを代表として使う
 */
export type Database = PrismaClient;

const createPostgresClient = (): Database =>
	new PrismaClient({
		adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
	});

const createDatabase = (): Database => {
	const provider = parseDatabaseProvider(process.env.DATABASE_PROVIDER);
	switch (provider) {
		case "postgresql":
			return createPostgresClient();
		case "sqlite":
			// D1 の接続は Workers の binding からしか作れない。Cloudflare 向けの build でつなぐ
			throw new Error(
				"DATABASE_PROVIDER=sqlite は Cloudflare D1 でだけ使えます（Node では postgresql を使ってください）",
			);
	}
};

// 開発中は HMR のたびにモジュールが読み直されるので、接続を globalThis に置いて使い回す
const globalForPrisma = globalThis as unknown as {
	prisma?: Database;
};

export const prisma = globalForPrisma.prisma ?? createDatabase();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
