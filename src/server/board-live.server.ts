// シフトの画面に関わる、シフト以外の変更（持ち場・スタッフ・タイムテーブル・設定・希望）を、開いている画面に知らせる。
// 知らせる先（単位の一覧）はリクエストの中で調べ、送るのは応答のあと（Workers ではリクエストの DB の接続を、
// 応答のあとまで使えるとは限らないため）
import { platform } from "#platform";
import { prisma } from "../lib/prisma.server";
import {
	type BoardChangeReason,
	type ShiftBoardEvent,
	shiftBoardChannel,
} from "../lib/shift-board-live";
import type { ShiftScopeIds } from "./shifts.server";

/** 決まった単位に知らせる（待たずに戻る） */
export const announceBoardChange = (
	scopes: ShiftScopeIds | ShiftScopeIds[],
	reason: BoardChangeReason,
): void => {
	const list = Array.isArray(scopes) ? scopes : [scopes];
	if (list.length === 0) return;
	const message = JSON.stringify({
		type: "board.changed",
		reason,
	} satisfies ShiftBoardEvent);
	platform.runInBackground("シフトの画面に変更を知らせられませんでした", () =>
		Promise.all(
			list.map((scope) =>
				platform.realtime.publish(shiftBoardChannel(scope), message),
			),
		),
	);
};

/** テナントの日常シフトと、そのテナントのイベントすべて */
export const tenantBoardScopes = async (
	organizationId: string,
	tenantId: string,
): Promise<ShiftScopeIds[]> => {
	const events = await prisma.event.findMany({
		where: { organizationId, tenantId },
		select: { id: true },
	});
	return [
		{ organizationId, tenantId, eventId: null },
		...events.map((event) => ({ organizationId, tenantId, eventId: event.id })),
	];
};

/** 団体のすべての単位（テナントごとの日常シフトと、すべてのイベント） */
export const organizationBoardScopes = async (
	organizationId: string,
): Promise<ShiftScopeIds[]> => {
	const tenants = await prisma.tenant.findMany({
		where: { organizationId },
		select: { id: true, events: { select: { id: true } } },
	});
	return tenants.flatMap((tenant) => [
		{ organizationId, tenantId: tenant.id, eventId: null },
		...tenant.events.map((event) => ({
			organizationId,
			tenantId: tenant.id,
			eventId: event.id,
		})),
	]);
};

/**
 * 団体・テナント・イベントのどの単位の変更かから、知らせる先を決めて知らせる。
 * 団体全体の変更は団体のすべての単位、テナントの変更はそのテナントの日常シフトとイベント、イベントはそのイベントだけ
 */
export const announceForLevel = async (
	ids: {
		organizationId: string;
		tenantId: string | null;
		eventId: string | null;
	},
	reason: BoardChangeReason,
): Promise<void> => {
	if (ids.tenantId && ids.eventId) {
		announceBoardChange(
			{
				organizationId: ids.organizationId,
				tenantId: ids.tenantId,
				eventId: ids.eventId,
			},
			reason,
		);
		return;
	}
	announceBoardChange(
		ids.tenantId
			? await tenantBoardScopes(ids.organizationId, ids.tenantId)
			: await organizationBoardScopes(ids.organizationId),
		reason,
	);
};
