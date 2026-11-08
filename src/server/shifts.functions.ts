import { createServerFn } from "@tanstack/react-start";
import { type Shift, ShiftStatus } from "../types";
import { requireUserMiddleware } from "./auth-middleware";
import { OrgAccessError, requireOrgAccess } from "./org-access.server";
import {
	removeShift,
	saveShift,
	type ShiftWriteResult,
} from "./shift-write.server";
import { findShiftBoard } from "./shifts.server";

// 画面から呼ぶ。どれもログインが必要で（requireUserMiddleware）、団体のメンバーかと権限を毎回確かめる

const requireSlug = (value: unknown): string => {
	if (typeof value !== "string" || value === "") {
		throw new Error("Organization is required");
	}
	return value;
};

const requireId = (value: unknown): string => {
	if (typeof value !== "string" || value === "") {
		throw new Error("Shift id is required");
	}
	return value;
};

const parseStatus = (status: unknown): ShiftStatus => {
	if (status === ShiftStatus.draft || status === ShiftStatus.confirmed)
		return status;
	throw new Error(`Invalid shift status: ${String(status)}`);
};

export const getShiftBoard = createServerFn({ method: "GET" })
	.middleware([requireUserMiddleware])
	.validator((data: { orgSlug: unknown; status: unknown }) => ({
		orgSlug: requireSlug(data.orgSlug),
		status: parseStatus(data.status),
	}))
	.handler(async ({ data, context }) => {
		const access = await requireOrgAccess(
			context.user.id,
			data.orgSlug,
			"shift.view",
		);
		return findShiftBoard(access.organization.id, data.status);
	});

/** 画面に返す結果。issues（zod の詳細）は返さず、画面に出せる errors だけにする */
export type ShiftMutationResult =
	| { ok: true; shift: Shift }
	| { ok: false; message: string; errors: string[] };

const toMutationResult = (result: ShiftWriteResult): ShiftMutationResult =>
	result.ok
		? result
		: {
				ok: false,
				message: result.message,
				errors: result.errors ?? [result.message],
			};

/** 団体のメンバーかを確かめ、書き込みの権限は saveShift / removeShift が見る */
const writeAccess = async (userId: string, orgSlug: string) => {
	try {
		const access = await requireOrgAccess(userId, orgSlug, "shift.view");
		return { organizationId: access.organization.id, role: access.member.role };
	} catch (error) {
		if (error instanceof OrgAccessError) return null;
		throw error;
	}
};

const notFoundResult: ShiftMutationResult = {
	ok: false,
	message: "Not found",
	errors: ["団体が見つかりません"],
};

/** シフトを作る。入力の検証と権限の確認は saveShift が行う */
export const createShift = createServerFn({ method: "POST" })
	.middleware([requireUserMiddleware])
	.validator((data: { orgSlug: unknown; input: unknown }) => ({
		orgSlug: requireSlug(data.orgSlug),
		input: data.input,
	}))
	.handler(async ({ data, context }) => {
		const access = await writeAccess(context.user.id, data.orgSlug);
		if (!access) return notFoundResult;
		return toMutationResult(await saveShift(access, data.input));
	});

/** シフトを更新する */
export const updateShift = createServerFn({ method: "POST" })
	.middleware([requireUserMiddleware])
	.validator((data: { orgSlug: unknown; id: unknown; input: unknown }) => ({
		orgSlug: requireSlug(data.orgSlug),
		id: requireId(data.id),
		input: data.input,
	}))
	.handler(async ({ data, context }) => {
		const access = await writeAccess(context.user.id, data.orgSlug);
		if (!access) return notFoundResult;
		return toMutationResult(await saveShift(access, data.input, data.id));
	});

/** シフトを消す */
export const deleteShift = createServerFn({ method: "POST" })
	.middleware([requireUserMiddleware])
	.validator((data: { orgSlug: unknown; id: unknown }) => ({
		orgSlug: requireSlug(data.orgSlug),
		id: requireId(data.id),
	}))
	.handler(async ({ data, context }) => {
		const access = await writeAccess(context.user.id, data.orgSlug);
		if (!access) return notFoundResult;
		return toMutationResult(await removeShift(access, data.id));
	});
