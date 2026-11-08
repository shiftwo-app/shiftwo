import type { PrismaClient } from "../generated/prisma-postgresql/client";

/**
 * アプリで使う Prisma Client の型。Postgres 用と SQLite（D1）用、Node 用と Workers 用は
 * 同じモデル定義から作るので、呼び出し方は同じ。型は Node の Postgres 用のものを代表として使う
 */
export type Database = PrismaClient;
