import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { prisma } from "../lib/prisma.server";
import { requireUserMiddleware } from "./auth-middleware";

// アカウントの設定のパスキー。どれも本人のパスキーだけを扱う（登録は Better Auth の /passkey/* をブラウザから呼ぶ）

/** 本人のパスキーの一覧（鍵の中身は返さない） */
export const listMyPasskeysFn = createServerFn({ method: "GET" })
	.middleware([requireUserMiddleware])
	.handler(({ context }) =>
		prisma.passkey.findMany({
			where: { userId: context.user.id },
			select: { id: true, name: true, createdAt: true, backedUp: true },
			orderBy: { createdAt: "asc" },
		}),
	);

/** 本人のパスキーを消す（ほかの人のものは消せない） */
export const deleteMyPasskeyFn = createServerFn({ method: "POST" })
	.middleware([requireUserMiddleware])
	.validator((data: { id: string }) =>
		z.object({ id: z.string().min(1).max(200) }).parse(data),
	)
	.handler(async ({ data, context }) => {
		const { count } = await prisma.passkey.deleteMany({
			where: { id: data.id, userId: context.user.id },
		});
		return { ok: count > 0 };
	});
