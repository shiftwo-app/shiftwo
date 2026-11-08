import { createServerFn } from "@tanstack/react-start";
import { platform } from "#platform";
import { z } from "zod";
import { serverT } from "../lib/i18n/request-locale.server";
import { hasPermission } from "../lib/org/permissions";
import { prisma } from "../lib/prisma.server";
import { type Shift, ShiftStatus } from "../types";
import { requireUserMiddleware } from "./auth-middleware";
import { OrgAccessError } from "./org-access.server";
import {
	findScopeAccess,
	requireScopeAccess,
	type ScopeAccess,
	type ShiftScopeParams,
} from "./scope-access.server";
import {
	removeShift,
	saveShift,
	type ShiftWriteAccess,
	type ShiftWriteResult,
} from "./shift-write.server";
import { conflictsOf } from "./shift-conflicts.server";
import { findShiftBoard } from "./shifts.server";

// 画面から呼ぶ。どれもログインが必要で（requireUserMiddleware）、
// シフトの単位（団体・テナント・イベント）のメンバーかと、その単位での権限を毎回確かめる

const scopeSchema = z.object({
	orgSlug: z.string().min(1),
	tenantSlug: z.string().min(1),
	eventSlug: z.string().min(1).nullish(),
});

const parseScope = (data: unknown): ShiftScopeParams => scopeSchema.parse(data);

const parseStatus = (status: unknown): ShiftStatus => {
	if (status === ShiftStatus.draft || status === ShiftStatus.confirmed)
		return status;
	throw new Error(`Invalid shift status: ${String(status)}`);
};

const toIds = (access: ScopeAccess) => ({
	organizationId: access.organization.id,
	tenantId: access.tenant.id,
	eventId: access.event?.id ?? null,
});

/** テナント（日常シフト）の画面の土台：テナント・この単位での役割・イベントの一覧。見つからなければ null */
export const getTenantContext = createServerFn({ method: "GET" })
	.middleware([requireUserMiddleware])
	.validator((data: { orgSlug: unknown; tenantSlug: unknown }) =>
		parseScope({ orgSlug: data.orgSlug, tenantSlug: data.tenantSlug }),
	)
	.handler(async ({ data, context }) => {
		const access = await findScopeAccess(context.user.id, data);
		if (!access) return null;
		const events = await prisma.event.findMany({
			where: { tenantId: access.tenant.id },
			select: { slug: true, name: true },
			orderBy: { name: "asc" },
		});
		return {
			tenant: access.tenant,
			events,
			canEditShifts: hasPermission(access.permissions, "shift.edit"),
			/** このテナントでの権限（設定へのリンクを出すかに使う。守りはサーバー側） */
			permissions: access.permissions,
			timeUnitMinutes: access.timeUnitMinutes,
			/** このテナントで持ち場を使うか（決まったもの）と、テナントの上書きの設定・団体の基本の設定 */
			positionsEnabled: access.positionsEnabled,
			positionsOverride: access.tenant.positionsEnabled,
			organizationPositionsEnabled: access.organizationPositionsEnabled,
		};
	});

/** イベントの画面の土台：イベント・この単位での役割・時間粒度。見つからなければ null */
export const getEventContext = createServerFn({ method: "GET" })
	.middleware([requireUserMiddleware])
	.validator(
		(data: { orgSlug: unknown; tenantSlug: unknown; eventSlug: unknown }) =>
			scopeSchema.required({ eventSlug: true }).parse(data),
	)
	.handler(async ({ data, context }) => {
		const access = await findScopeAccess(context.user.id, data);
		if (!access?.event) return null;
		return {
			event: access.event,
			canEditShifts: hasPermission(access.permissions, "shift.edit"),
			/** このイベントでの権限（設定へのリンクを出すかに使う。守りはサーバー側） */
			permissions: access.permissions,
			timeUnitMinutes: access.timeUnitMinutes,
			/** このイベントで持ち場を使うか（決まったもの）と、イベントの上書きの設定・テナントまでで決まる値 */
			positionsEnabled: access.positionsEnabled,
			positionsOverride: access.event.positionsEnabled,
			inheritedPositionsEnabled:
				access.tenant.positionsEnabled ?? access.organizationPositionsEnabled,
		};
	});

export const getShiftBoard = createServerFn({ method: "GET" })
	.middleware([requireUserMiddleware])
	.validator((data: ShiftScopeParams & { status: unknown }) => ({
		scope: parseScope(data),
		status: parseStatus(data.status),
	}))
	.handler(async ({ data, context }) => {
		const access = await requireScopeAccess(
			context.user.id,
			data.scope,
			"shift.view",
		);
		const [board, myStaff] = await Promise.all([
			findShiftBoard(toIds(access), data.status),
			prisma.staff.findFirst({
				where: {
					organizationId: access.organization.id,
					memberId: access.member.id,
				},
				select: { id: true },
			}),
		]);
		const canEdit = hasPermission(access.permissions, "shift.edit");
		return {
			...board,
			timeUnitMinutes: access.timeUnitMinutes,
			canEdit,
			/** この単位で持ち場を使うか（使わないなら、シフトは人と時間だけ） */
			positionsEnabled: access.positionsEnabled,
			/** レポートで、シフトのあいだの空きを休憩とみなす長さ（分。テナントの設定） */
			breakGapMinutes: access.tenant.breakGapMinutes,
			/** 自分に紐づくスタッフ（レポートで、自分の分を書き出すため。いなければ null） */
			myStaffId: myStaff?.id ?? null,
			/**
			 * 希望と違う割り当て（FR-4-E）：シフトの ID → 理由。希望の中身（休憩・持ち場）は本人とシフトを組む人のものなので、
			 * シフトを編集できる人にだけ返す
			 */
			preferenceConflicts: canEdit
				? await conflictsOf(toIds(access), board.shifts)
				: {},
			/** ほかの人の変更を受け取る方式（同時編集） */
			liveTransport: platform.realtime.transport,
		};
	});

/** 画面に返す結果。issues（zod の詳細）は返さず、画面に出せる errors だけにする */
export type ShiftMutationResult =
	| { ok: true; shift: Shift }
	| { ok: false; message: string; errors: string[]; conflict?: boolean };

const toMutationResult = (result: ShiftWriteResult): ShiftMutationResult =>
	result.ok
		? result
		: {
				ok: false,
				message: result.message,
				errors: result.errors ?? [result.message],
				conflict: result.conflict,
			};

/** この単位のメンバーかを確かめる。書き込みの権限は saveShift / removeShift が見る */
const writeAccess = async (
	userId: string,
	scope: ShiftScopeParams,
): Promise<ShiftWriteAccess | null> => {
	try {
		const access = await requireScopeAccess(userId, scope, "shift.view");
		return {
			...toIds(access),
			permissions: access.permissions,
			timeUnitMinutes: access.timeUnitMinutes,
			positionsEnabled: access.positionsEnabled,
		};
	} catch (error) {
		if (error instanceof OrgAccessError) return null;
		throw error;
	}
};

const notFoundResult = (): ShiftMutationResult => ({
	ok: false,
	message: "Not found",
	errors: [serverT("board.errorNotFound")],
});

const requireId = (value: unknown): string => z.string().min(1).parse(value);
/** 読んだときの version（画面から必ず送る。保存のときに、今の version と同じかを確かめる） */
const requireVersion = (value: unknown): number =>
	z.number().int().min(1).parse(value);

/** シフトを作る。入力の検証と権限の確認は saveShift が行う（イベントかどうかは、単位で決まる） */
export const createShift = createServerFn({ method: "POST" })
	.middleware([requireUserMiddleware])
	.validator((data: { scope: unknown; input: unknown }) => ({
		scope: parseScope(data.scope),
		input: data.input,
	}))
	.handler(async ({ data, context }) => {
		const access = await writeAccess(context.user.id, data.scope);
		if (!access) return notFoundResult();
		return toMutationResult(await saveShift(access, data.input));
	});

/** シフトを更新する */
export const updateShift = createServerFn({ method: "POST" })
	.middleware([requireUserMiddleware])
	.validator(
		(data: {
			scope: unknown;
			id: unknown;
			version: unknown;
			input: unknown;
		}) => ({
			scope: parseScope(data.scope),
			id: requireId(data.id),
			version: requireVersion(data.version),
			input: data.input,
		}),
	)
	.handler(async ({ data, context }) => {
		const access = await writeAccess(context.user.id, data.scope);
		if (!access) return notFoundResult();
		return toMutationResult(
			await saveShift(access, data.input, data.id, data.version),
		);
	});

/** シフトを消す */
export const deleteShift = createServerFn({ method: "POST" })
	.middleware([requireUserMiddleware])
	.validator((data: { scope: unknown; id: unknown; version: unknown }) => ({
		scope: parseScope(data.scope),
		id: requireId(data.id),
		version: requireVersion(data.version),
	}))
	.handler(async ({ data, context }) => {
		const access = await writeAccess(context.user.id, data.scope);
		if (!access) return notFoundResult();
		return toMutationResult(await removeShift(access, data.id, data.version));
	});
