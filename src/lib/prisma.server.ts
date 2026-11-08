import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../generated/prisma/client";
import { loadEnvFileIfExists } from "./load-env";

loadEnvFileIfExists();

const createPrismaClient = () =>
	new PrismaClient({
		adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
	});

// 開発中は HMR のたびにモジュールが読み直されるので、接続を globalThis に置いて使い回す
const globalForPrisma = globalThis as unknown as {
	prisma?: PrismaClient;
};

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
