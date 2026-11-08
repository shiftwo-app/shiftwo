import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { serverT } from "../lib/i18n/request-locale.server";
import { TIMETABLE_MAX_BYTES } from "../lib/timetable";
import { requireUserMiddleware } from "./auth-middleware";
import { OrgAccessError } from "./org-access.server";
import {
	clearTimetable,
	deleteSession,
	importTimetable,
	listSessions,
	requireTimetableAccess,
	updateSession,
} from "./timetable.server";

// タイムテーブル（FR-6）の画面から呼ぶ server function。どれもログインが必要で、
// イベントと権限は timetable.server.ts で毎回確かめる

const scopeSchema = z.object({
	orgSlug: z.string().min(1),
	tenantSlug: z.string().min(1),
	eventSlug: z.string().min(1),
});

const notFound = () => ({
	ok: false as const,
	errors: [serverT("timetable.errorNotFound")],
});

/** 所属していない・イベントがない・権限が足りないを null にする。ほかは投げ直す */
const orNull = async <T>(load: () => Promise<T>): Promise<T | null> => {
	try {
		return await load();
	} catch (error) {
		if (error instanceof OrgAccessError) return null;
		throw error;
	}
};

/** タイムテーブルの画面：セッションと、変えられるか */
export const getTimetableFn = createServerFn({ method: "GET" })
	.middleware([requireUserMiddleware])
	.validator((data: unknown) => scopeSchema.parse(data))
	.handler(async ({ data, context }) => {
		const access = await requireTimetableAccess(context.user.id, data);
		return {
			event: { name: access.event.name },
			canManage: access.canManage,
			period: access.period,
			sessions: await listSessions(access.event.id),
		};
	});

/** 取り込む（apply が false なら確かめるだけ） */
export const importTimetableFn = createServerFn({ method: "POST" })
	.middleware([requireUserMiddleware])
	.validator((data: unknown) =>
		scopeSchema
			.extend({
				content: z.string().max(TIMETABLE_MAX_BYTES * 2),
				format: z.enum(["csv", "json"]),
				fileName: z.string().max(500),
				apply: z.boolean(),
			})
			.parse(data),
	)
	.handler(async ({ data, context }) => {
		const access = await orNull(() =>
			requireTimetableAccess(context.user.id, data, "event.manage"),
		);
		if (!access) return notFound();
		return importTimetable(access, data);
	});

const sessionInputSchema = z.object({
	title: z.string().max(1000),
	speaker: z.string().max(1000),
	room: z.string().max(1000),
	start: z.string().max(100),
	end: z.string().max(100),
	trackColor: z.string().max(20).nullable(),
	tags: z.array(z.string().max(200)).max(100),
});

/** 1 セッションを直す */
export const updateSessionFn = createServerFn({ method: "POST" })
	.middleware([requireUserMiddleware])
	.validator((data: unknown) =>
		scopeSchema
			.extend({ id: z.uuid(), session: sessionInputSchema })
			.parse(data),
	)
	.handler(async ({ data, context }) => {
		const access = await orNull(() =>
			requireTimetableAccess(context.user.id, data, "event.manage"),
		);
		if (!access) return notFound();
		return updateSession(access, data.id, data.session);
	});

/** 1 セッションを消す */
export const deleteSessionFn = createServerFn({ method: "POST" })
	.middleware([requireUserMiddleware])
	.validator((data: unknown) =>
		scopeSchema.extend({ id: z.uuid() }).parse(data),
	)
	.handler(async ({ data, context }) => {
		const access = await orNull(() =>
			requireTimetableAccess(context.user.id, data, "event.manage"),
		);
		if (!access) return notFound();
		return deleteSession(access, data.id);
	});

/** タイムテーブルをまるごと消す */
export const clearTimetableFn = createServerFn({ method: "POST" })
	.middleware([requireUserMiddleware])
	.validator((data: unknown) => scopeSchema.parse(data))
	.handler(async ({ data, context }) => {
		const access = await orNull(() =>
			requireTimetableAccess(context.user.id, data, "event.manage"),
		);
		if (!access) return notFound();
		return clearTimetable(access);
	});
