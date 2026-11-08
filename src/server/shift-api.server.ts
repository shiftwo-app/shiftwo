// シフトの API（日常シフト /api/o/<団体>/t/<テナント>/shifts と、イベント .../e/<イベント>/shifts）の handler。
// ログインしていなければ 401、所属していない・テナントやイベントがない → 404、権限が足りない → 403
import { platform } from "#platform";
import type { Permission } from "../lib/org/permissions";
import { shiftBoardChannel } from "../lib/shift-board-live";
import type { ShiftStatus } from "../types";
import { orgAccessErrorResponse } from "./org-access.server";
import { requireScopeAccess, type ScopeAccess } from "./scope-access.server";
import { forbiddenOrigin, isSameOriginRequest } from "./same-origin.server";
import { getSessionUserFromHeaders } from "./session.server";
import {
	deleteShiftResponse,
	type ShiftWriteAccess,
	writeShift,
} from "./shift-write.server";
import { findShiftsWithRelations } from "./shifts.server";

type ScopeRouteParams = {
	orgSlug: string;
	tenantSlug: string;
	eventSlug?: string;
};

type Ctx<P> = { request: Request; params: P };

const withScope =
	<P extends ScopeRouteParams>(
		permission: Permission,
		handler: (
			ctx: Ctx<P> & { access: ScopeAccess },
		) => Response | Promise<Response>,
	) =>
	async (ctx: Ctx<P>): Promise<Response> => {
		const user = await getSessionUserFromHeaders(ctx.request.headers);
		if (!user)
			return Response.json({ message: "Unauthorized" }, { status: 401 });
		let access: ScopeAccess;
		try {
			access = await requireScopeAccess(user.id, ctx.params, permission);
		} catch (error) {
			return orgAccessErrorResponse(error);
		}
		return handler({ ...ctx, access });
	};

const idsOf = (access: ScopeAccess) => ({
	organizationId: access.organization.id,
	tenantId: access.tenant.id,
	eventId: access.event?.id ?? null,
});

const writeAccessOf = (access: ScopeAccess): ShiftWriteAccess => ({
	...idsOf(access),
	permissions: access.permissions,
	timeUnitMinutes: access.timeUnitMinutes,
	positionsEnabled: access.positionsEnabled,
});

/** シフトの一覧（GET） */
export const listShiftsHandler = <P extends ScopeRouteParams>(
	status: ShiftStatus,
) =>
	withScope<P>("shift.view", async ({ access }) =>
		Response.json(await findShiftsWithRelations(idsOf(access), status)),
	);

/** シフトの作成（POST。権限は writeShift が見る） */
export const createShiftHandler = <P extends ScopeRouteParams>() =>
	withScope<P>("shift.view", ({ request, access }) =>
		writeShift(request, writeAccessOf(access)),
	);

/** シフトの更新（PUT） */
export const updateShiftHandler = <
	P extends ScopeRouteParams & { id: string },
>() =>
	withScope<P>("shift.view", ({ request, params, access }) =>
		writeShift(request, writeAccessOf(access), params.id),
	);

/** シフトの削除（DELETE） */
export const deleteShiftHandler = <
	P extends ScopeRouteParams & { id: string },
>() =>
	withScope<P>("shift.view", ({ params, access }) =>
		deleteShiftResponse(writeAccessOf(access), params.id),
	);

/**
 * 同時編集：この単位のシフトの変更を受け取る（GET。Node は SSE、Cloudflare は WebSocket）。
 * Cookie で認証するので、Origin があれば（WebSocket には必ず付く）このアプリのものに限る
 * （よそのサイトから、見ている人の Cookie でつながせない）
 */
export const liveHandler = <P extends ScopeRouteParams>() => {
	const handler = withScope<P>("shift.view", ({ request, access }) =>
		platform.realtime.subscribe(request, shiftBoardChannel(idsOf(access))),
	);
	return (ctx: Ctx<P>) =>
		ctx.request.headers.has("origin") && !isSameOriginRequest(ctx.request)
			? forbiddenOrigin()
			: handler(ctx);
};
