import { PrismaClient } from "@prisma/client";

// NOTE: 以下リンクを参考に書き換えました
// REF: https://www.prisma.io/docs/guides/nextjs
const globalForPrisma = global as unknown as {
	prisma: PrismaClient;
};

export const prisma = globalForPrisma.prisma || new PrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
