import { PrismaClient } from "@prisma/client";

// 開発中は HMR のたびにモジュールが読み直されるので、接続を globalThis に置いて使い回す
const globalForPrisma = globalThis as unknown as {
	prisma?: PrismaClient;
};

export const prisma = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
