// イベントのタイムテーブル（FR-6）の読み書き。
// 見るのはシフトを見られる人（shift.view）。取り込み・直す・消すのは、イベントを管理できる人（event.manage）だけ（FR-6-D）。
// どの操作も、そのイベントの ID で絞り込み、ほかのイベントのセッションには触れない
import { announceBoardChange } from "./board-live.server";
import { serverT } from "../lib/i18n/request-locale.server";
import { hasPermission } from "../lib/org/permissions";
import { prisma } from "../lib/prisma.server";
import {
	parseTimetable,
	type TimetableFormat,
	type TimetableRow,
} from "../lib/timetable";
import { OrgAccessError } from "./org-access.server";
import {
	requireScopeAccess,
	type ScopeAccess,
	type ShiftScopeParams,
} from "./scope-access.server";

export type TimetableScope = ShiftScopeParams & { eventSlug: string };

export type TimetableAccess = ScopeAccess & {
	event: NonNullable<ScopeAccess["event"]>;
	/** タイムテーブルを変えられるか（event.manage） */
	canManage: boolean;
	/** イベントの期間（決まっていなければ null） */
	period: { start: number; end: number } | null;
};

/** 画面・MCP に返すセッション */
export type SessionView = {
	id: string;
	title: string;
	speaker: string;
	room: string;
	start: string;
	end: string;
	trackColor: string | null;
	tags: string[];
};

/** イベントを確かめる。所属していない・イベントがない → 404、権限が足りない → 403 */
export const requireTimetableAccess = async (
	userId: string,
	scope: TimetableScope,
	permission: "shift.view" | "event.manage" = "shift.view",
): Promise<TimetableAccess> => {
	const access = await requireScopeAccess(userId, scope, permission);
	if (!access.event) throw new OrgAccessError(404, "Not found");
	const event = await prisma.event.findUniqueOrThrow({
		where: { id: access.event.id },
		select: { startsAt: true, endsAt: true },
	});
	return {
		...access,
		event: access.event,
		canManage: hasPermission(access.permissions, "event.manage"),
		period:
			event.startsAt && event.endsAt
				? { start: event.startsAt.getTime(), end: event.endsAt.getTime() }
				: null,
	};
};

const readTags = (value: unknown): string[] =>
	Array.isArray(value) ? value.map(String) : [];

export const listSessions = async (eventId: string): Promise<SessionView[]> => {
	const sessions = await prisma.eventSession.findMany({
		where: { eventId },
		orderBy: [{ startsAt: "asc" }, { createdAt: "asc" }],
	});
	return sessions.map((session) => ({
		id: session.id,
		title: session.title,
		speaker: session.speaker,
		room: session.room,
		start: session.startsAt.toISOString(),
		end: session.endsAt.toISOString(),
		trackColor: session.trackColor,
		tags: readTags(session.tags),
	}));
};

/** シフトの画面に重ねているタイムテーブルが変わったことを、そのイベントの画面に知らせる */
const announceTimetable = (access: TimetableAccess) =>
	announceBoardChange(
		{
			organizationId: access.organization.id,
			tenantId: access.tenant.id,
			eventId: access.event.id,
		},
		"timetable",
	);

const forbidden = () => ({
	ok: false as const,
	errors: [serverT("timetable.errorForbidden")],
});

/** 取り込みの結果。apply が false なら確かめるだけ（rows を返す） */
export type ImportTimetableResult =
	| { ok: true; applied: false; rows: TimetableRow[] }
	| { ok: true; applied: true; count: number }
	| { ok: false; errors: string[]; rows?: TimetableRow[] };

/**
 * タイムテーブルを取り込む。サーバーで読み直して確かめ、どれかの行に問題があれば何も変えない。
 * 取り込むと、このイベントのセッションをまるごと置き換える
 */
export const importTimetable = async (
	access: TimetableAccess,
	input: {
		content: string;
		format: TimetableFormat;
		fileName: string;
		apply: boolean;
	},
): Promise<ImportTimetableResult> => {
	if (!access.canManage) return forbidden();
	const parsed = parseTimetable(
		input.content,
		input.format,
		access.period,
		serverT,
	);
	if (!parsed.ok) return parsed;
	if (!input.apply) return { ok: true, applied: false, rows: parsed.rows };
	if (parsed.rows.some((row) => row.errors.length > 0)) {
		return {
			ok: false,
			errors: [
				serverT("timetable.hasErrors", {
					count: parsed.rows.filter((row) => row.errors.length > 0).length,
				}),
			],
			rows: parsed.rows,
		};
	}
	const importSource = `${input.format}:${input.fileName.slice(0, 200)}`;
	await prisma.$transaction([
		prisma.eventSession.deleteMany({ where: { eventId: access.event.id } }),
		prisma.eventSession.createMany({
			data: parsed.rows.map((row) => ({
				organizationId: access.organization.id,
				eventId: access.event.id,
				title: row.title,
				speaker: row.speaker,
				room: row.room,
				startsAt: new Date(row.start!),
				endsAt: new Date(row.end!),
				trackColor: row.trackColor,
				tags: row.tags,
				importSource,
			})),
		}),
	]);
	announceTimetable(access);
	return { ok: true, applied: true, count: parsed.rows.length };
};

export type SessionInput = {
	title: string;
	speaker: string;
	room: string;
	start: string;
	end: string;
	trackColor: string | null;
	tags: string[];
};

/** 1 セッションを直す（取り込みと同じ決まりで確かめる） */
export const updateSession = async (
	access: TimetableAccess,
	id: string,
	input: SessionInput,
): Promise<{ ok: true } | { ok: false; errors: string[] }> => {
	if (!access.canManage) return forbidden();
	const parsed = parseTimetable(
		JSON.stringify([input]),
		"json",
		access.period,
		serverT,
	);
	const row = parsed.ok ? parsed.rows[0] : undefined;
	if (!parsed.ok) return parsed;
	if (!row || row.errors.length > 0) {
		return { ok: false, errors: row?.errors ?? [] };
	}
	const { count } = await prisma.eventSession.updateMany({
		where: { id, eventId: access.event.id },
		data: {
			title: row.title,
			speaker: row.speaker,
			room: row.room,
			startsAt: new Date(row.start!),
			endsAt: new Date(row.end!),
			trackColor: row.trackColor,
			tags: row.tags,
		},
	});
	if (count === 0) {
		return { ok: false, errors: [serverT("timetable.errorNotFound")] };
	}
	announceTimetable(access);
	return { ok: true };
};

/** 1 セッションを消す */
export const deleteSession = async (
	access: TimetableAccess,
	id: string,
): Promise<{ ok: true } | { ok: false; errors: string[] }> => {
	if (!access.canManage) return forbidden();
	const { count } = await prisma.eventSession.deleteMany({
		where: { id, eventId: access.event.id },
	});
	if (count === 0) {
		return { ok: false, errors: [serverT("timetable.errorNotFound")] };
	}
	announceTimetable(access);
	return { ok: true };
};

/** このイベントのタイムテーブルをまるごと消す */
export const clearTimetable = async (
	access: TimetableAccess,
): Promise<{ ok: true; count: number } | { ok: false; errors: string[] }> => {
	if (!access.canManage) return forbidden();
	const { count } = await prisma.eventSession.deleteMany({
		where: { eventId: access.event.id },
	});
	announceTimetable(access);
	return { ok: true, count };
};
