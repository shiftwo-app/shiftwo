// MCP（AI のアシスタントからシフトヲを使う）の道具（tools）。
// どの道具も、トークンの持ち主（principal.userId）として、シフトヲの画面と同じ確かめ方で動く：
// - 所属していない団体・見られない単位は見えない（requireScopeAccess / requirePreferenceContext）
// - シフトを作る・変える・消すのは saveShift / removeShift が権限（shift.edit・shift.confirm）を見る
// - 希望は本人の分だけ（savePreference が締切や本人かを見る）
// そのうえで、書き込む道具は shiftwo:write のスコープを許されたつなぎ方でだけ使える
import { McpServer } from "@modelcontextprotocol/server";
import { z } from "zod";
import { MCP_SCOPE_WRITE } from "../lib/mcp-config";
import { hasPermission } from "../lib/org/permissions";
import type { PreferenceScope } from "../lib/preferences";
import { prisma } from "../lib/prisma.server";
import { ShiftStatus, type Shift } from "../types";
import type { McpPrincipal } from "./mcp-auth.server";
import { findMembership, OrgAccessError } from "./org-access.server";
import {
	findMyStaff,
	getPreferenceOf,
	listPreferenceScopes,
	requirePreferenceContext,
	savePreference,
	selectablePositions,
} from "./preferences.server";
import {
	requireScopeAccess,
	type ScopeAccess,
	type ShiftScopeParams,
} from "./scope-access.server";
import { conflictsOf } from "./shift-conflicts.server";
import {
	removeShift,
	saveShift,
	type ShiftWriteAccess,
	type ShiftWriteResult,
} from "./shift-write.server";
import { findShiftBoard } from "./shifts.server";

const JST_OFFSET_MS = 9 * 60 * 60 * 1000;

/** 日本時間の ISO 8601（+09:00 付き）。シフトヲの時刻は日本時間で扱う */
export const toJstIso = (value: Date | string | number): string =>
	new Date(new Date(value).getTime() + JST_OFFSET_MS)
		.toISOString()
		.replace(/\.\d{3}Z$/, "+09:00");

type ToolResult = {
	content: { type: "text"; text: string }[];
	structuredContent?: Record<string, unknown>;
	isError?: boolean;
};

const ok = (value: Record<string, unknown>): ToolResult => ({
	content: [{ type: "text", text: JSON.stringify(value, null, 2) }],
	structuredContent: value,
});

const failure = (message: string, details: string[] = []): ToolResult => ({
	content: [
		{ type: "text", text: [message, ...details].filter(Boolean).join("\n") },
	],
	isError: true,
});

const NOT_FOUND =
	"Not found, or you do not have access to it. Use list_organizations and list_scopes to see what you can access.";

/** 所属・権限の確かめで投げられたものを、道具の失敗にする。想定外のものは投げ直す */
const guard = async (run: () => Promise<ToolResult>): Promise<ToolResult> => {
	try {
		return await run();
	} catch (error) {
		if (error instanceof OrgAccessError) {
			return failure(
				error.status === 403
					? "You do not have permission to do this in shiftwo."
					: NOT_FOUND,
			);
		}
		throw error;
	}
};

const writeFailure = (result: Exclude<ShiftWriteResult, { ok: true }>) =>
	failure(
		result.conflict
			? "The shift was changed by someone else. Call get_shift_board again to get the latest version, then retry."
			: result.message,
		result.errors ?? [],
	);

// ---- 入力の形 ----

const slug = z.string().min(1).max(200);
const isoDateTime = z.iso
	.datetime({ offset: true })
	.describe("ISO 8601 date-time with offset, e.g. 2026-11-20T10:00:00+09:00");

const shiftScopeInput = {
	orgSlug: slug.describe("Organization slug (from list_organizations)"),
	tenantSlug: slug.describe("Location slug (tenantSlug from list_scopes)"),
	eventSlug: slug
		.optional()
		.describe("Event slug (from list_scopes). Omit for regular (daily) shifts"),
};

const preferenceScopeInput = {
	orgSlug: slug.describe("Organization slug (from list_organizations)"),
	tenantSlug: slug
		.optional()
		.describe(
			"Location slug (tenantSlug from list_scopes). Omit both tenantSlug and eventSlug for the organization-wide preference",
		),
	eventSlug: slug
		.optional()
		.describe(
			"Event slug (requires tenantSlug) for an event-specific preference",
		),
};

const toShiftScope = (input: {
	orgSlug: string;
	tenantSlug: string;
	eventSlug?: string;
}): ShiftScopeParams => ({
	orgSlug: input.orgSlug,
	tenantSlug: input.tenantSlug,
	...(input.eventSlug ? { eventSlug: input.eventSlug } : {}),
});

const toPreferenceScope = (input: {
	tenantSlug?: string;
	eventSlug?: string;
}): PreferenceScope | null => {
	if (input.eventSlug) {
		return input.tenantSlug
			? {
					level: "event",
					tenantSlug: input.tenantSlug,
					eventSlug: input.eventSlug,
				}
			: null;
	}
	return input.tenantSlug
		? { level: "tenant", tenantSlug: input.tenantSlug }
		: { level: "org" };
};

const writeAccessOf = (access: ScopeAccess): ShiftWriteAccess => ({
	organizationId: access.organization.id,
	tenantId: access.tenant.id,
	eventId: access.event?.id ?? null,
	permissions: access.permissions,
	timeUnitMinutes: access.timeUnitMinutes,
	positionsEnabled: access.positionsEnabled,
});

const shiftView = (shift: Shift) => ({
	id: shift.id,
	version: shift.version,
	status: shift.status,
	staffId: shift.staffId,
	positionId: shift.positionId,
	start: toJstIso(shift.timeRange.start),
	end: toJstIso(shift.timeRange.end),
	isPreferredPosition: shift.isPreferredPosition,
});

const rangeView = (range: { start: number; end: number }) => ({
	start: toJstIso(range.start),
	end: toJstIso(range.end),
});

// ---- 道具 ----

/** 1 リクエスト分の MCP サーバー（道具は、トークンの持ち主として動く） */
export const createShiftwoMcpServer = (principal: McpPrincipal) => {
	const { userId } = principal;
	const canWrite = principal.scopes.has(MCP_SCOPE_WRITE);
	const server = new McpServer(
		{ name: "shiftwo", version: "1.0.0" },
		{
			instructions:
				"shiftwo (シフトヲ) manages staff shifts for organizations, their locations (such as stores or venues), and events. " +
				"You act as the signed-in user and can only see and change what that user can in shiftwo. " +
				"Start with list_organizations, then list_scopes. Times are in Japan Standard Time (+09:00).",
		},
	);

	const readOnly = { readOnlyHint: true, openWorldHint: false } as const;

	server.registerTool(
		"list_organizations",
		{
			title: "List my organizations",
			description:
				"List the shiftwo organizations the signed-in user belongs to, with their role names.",
			annotations: readOnly,
		},
		async () => {
			const members = await prisma.member.findMany({
				where: { userId, guildSuspendedAt: null },
				select: {
					isOwner: true,
					displayName: true,
					organization: { select: { slug: true, name: true } },
					roles: {
						select: { role: { select: { name: true, sortOrder: true } } },
					},
				},
				orderBy: { createdAt: "asc" },
			});
			return ok({
				organizations: members.map((member) => ({
					slug: member.organization.slug,
					name: member.organization.name,
					isOwner: member.isOwner,
					displayName: member.displayName,
					roleNames: member.roles
						.map((r) => r.role)
						.sort((a, b) => a.sortOrder - b.sortOrder)
						.map((r) => r.name),
				})),
				canWrite,
			});
		},
	);

	server.registerTool(
		"list_scopes",
		{
			title: "List locations and events",
			description:
				"List the locations (regular shifts; identified by tenantSlug) and their events in an organization whose shifts the user can view.",
			inputSchema: z.object({ orgSlug: shiftScopeInput.orgSlug }),
			annotations: readOnly,
		},
		async ({ orgSlug }) =>
			guard(async () => {
				const membership = await findMembership(userId, orgSlug);
				if (!membership) return failure(NOT_FOUND);
				const tenants = await listPreferenceScopes(membership, userId);
				return ok({
					organization: {
						slug: membership.organization.slug,
						name: membership.organization.name,
					},
					tenants,
				});
			}),
	);

	server.registerTool(
		"get_shift_board",
		{
			title: "Get shifts",
			description:
				"Get the shifts of a location (regular shifts) or an event, with its positions and staff. " +
				"Each shift has a version; pass it to update_shift or delete_shift. " +
				"preferenceConflicts (shift id -> reasons) is included only when the user can edit shifts.",
			inputSchema: z.object({
				...shiftScopeInput,
				status: z
					.enum([ShiftStatus.confirmed, ShiftStatus.draft])
					.default(ShiftStatus.confirmed)
					.describe("confirmed (published) or draft"),
			}),
			annotations: readOnly,
		},
		async (input) =>
			guard(async () => {
				const access = await requireScopeAccess(
					userId,
					toShiftScope(input),
					"shift.view",
				);
				const ids = {
					organizationId: access.organization.id,
					tenantId: access.tenant.id,
					eventId: access.event?.id ?? null,
				};
				const board = await findShiftBoard(ids, input.status);
				const canEdit = hasPermission(access.permissions, "shift.edit");
				return ok({
					scope: {
						organization: access.organization.slug,
						tenant: { slug: access.tenant.slug, name: access.tenant.name },
						event: access.event
							? { slug: access.event.slug, name: access.event.name }
							: null,
					},
					status: input.status,
					timeZone: "Asia/Tokyo",
					timeUnitMinutes: access.timeUnitMinutes,
					positionsEnabled: access.positionsEnabled,
					canEdit,
					canConfirm: hasPermission(access.permissions, "shift.confirm"),
					positions: board.positions.map((position) => ({
						id: position.id,
						name: position.name,
						requiredStaffCount: position.requiredStaffCount,
						isBreak: position.isBreak,
					})),
					staffs: board.staffs.map((staff) => ({
						id: staff.id,
						name: staff.name,
					})),
					shifts: board.shifts.map(shiftView),
					...(canEdit
						? { preferenceConflicts: await conflictsOf(ids, board.shifts) }
						: {}),
				});
			}),
	);

	server.registerTool(
		"get_my_preference",
		{
			title: "Get my preference",
			description:
				"Get the signed-in user's own shift preference (breaks, preferred positions, memo) for the organization, a location, or an event. " +
				"'effective' is what applies after inheriting from wider scopes.",
			inputSchema: z.object(preferenceScopeInput),
			annotations: readOnly,
		},
		async (input) =>
			guard(async () => {
				const scope = toPreferenceScope(input);
				if (!scope) return failure("eventSlug requires tenantSlug.");
				const context = await requirePreferenceContext(
					userId,
					input.orgSlug,
					scope,
				);
				const [myStaff, positions] = await Promise.all([
					findMyStaff(context),
					selectablePositions(context),
				]);
				if (!myStaff) {
					return failure(
						"You are not linked to a staff member in this organization, so you have no preferences here.",
					);
				}
				const view = await getPreferenceOf(context, myStaff);
				return ok({
					scope: context.label,
					deadline: context.deadline ? toJstIso(context.deadline) : null,
					period: context.period
						? {
								start: toJstIso(context.period.start),
								end: toJstIso(context.period.end),
							}
						: null,
					timeUnitMinutes: context.timeUnitMinutes,
					positionsEnabled: context.positionsEnabled,
					selectablePositions: positions,
					staff: view.staff,
					own: view.own
						? {
								breaks: view.own.breaks.map(rangeView),
								positionIds: view.own.positionIds,
								memo: view.own.memo,
								updatedAt: toJstIso(view.own.updatedAt),
							}
						: null,
					effective: {
						breaks: view.effective.breaks.map(rangeView),
						positionIds: view.effective.positionIds,
						memo: view.effective.memo,
						source: view.effective.source,
					},
				});
			}),
	);

	// ---- 書き込む道具（shiftwo:write を許されたときだけ） ----

	const readOnlyConnection = () =>
		failure(
			"This connection is read-only. Reconnect shiftwo and allow changes (shiftwo:write) to use this tool.",
		);

	const writeHints = { readOnlyHint: false, openWorldHint: false } as const;

	server.registerTool(
		"create_shift",
		{
			title: "Create a shift",
			description:
				"Create a shift (requires permission to edit shifts). Start and end must align to timeUnitMinutes. " +
				"New shifts are drafts unless status is set to confirmed (requires permission to confirm).",
			inputSchema: z.object({
				...shiftScopeInput,
				staffId: z.uuid(),
				positionId: z
					.uuid()
					.nullable()
					.default(null)
					.describe("Required when positions are enabled; null otherwise"),
				start: isoDateTime,
				end: isoDateTime,
				isPreferredPosition: z
					.boolean()
					.default(true)
					.describe(
						"false marks the assignment as against the staff's preference",
					),
				status: z.enum([ShiftStatus.draft, ShiftStatus.confirmed]).optional(),
			}),
			annotations: { ...writeHints, destructiveHint: false },
		},
		async (input) =>
			canWrite
				? guard(async () => {
						const access = await requireScopeAccess(
							userId,
							toShiftScope(input),
							"shift.view",
						);
						const result = await saveShift(writeAccessOf(access), {
							staffId: input.staffId,
							positionId: input.positionId,
							timeRange: { start: input.start, end: input.end },
							isPreferredPosition: input.isPreferredPosition,
							...(input.status ? { status: input.status } : {}),
						});
						return result.ok
							? ok({ shift: shiftView(result.shift) })
							: writeFailure(result);
					})
				: readOnlyConnection(),
	);

	server.registerTool(
		"update_shift",
		{
			title: "Update a shift",
			description:
				"Change a shift (requires permission to edit shifts; confirmed shifts also need permission to confirm). " +
				"Pass the version from get_shift_board; if someone changed the shift since, the update is rejected. " +
				"Omitted fields keep their current values.",
			inputSchema: z.object({
				...shiftScopeInput,
				shiftId: z.uuid(),
				version: z.int().min(0),
				staffId: z.uuid().optional(),
				positionId: z.uuid().nullable().optional(),
				start: isoDateTime.optional(),
				end: isoDateTime.optional(),
				isPreferredPosition: z.boolean().optional(),
				status: z.enum([ShiftStatus.draft, ShiftStatus.confirmed]).optional(),
			}),
			annotations: {
				...writeHints,
				destructiveHint: false,
				idempotentHint: true,
			},
		},
		async (input) =>
			canWrite
				? guard(async () => {
						const access = await requireScopeAccess(
							userId,
							toShiftScope(input),
							"shift.view",
						);
						const writeAccess = writeAccessOf(access);
						const current = await prisma.shift.findFirst({
							where: {
								id: input.shiftId,
								organizationId: writeAccess.organizationId,
								tenantId: writeAccess.tenantId,
								eventId: writeAccess.eventId,
							},
						});
						if (!current) return failure(NOT_FOUND);
						const range = current.timeRange as { start: string; end: string };
						const result = await saveShift(
							writeAccess,
							{
								staffId: input.staffId ?? current.staffId,
								positionId:
									input.positionId !== undefined
										? input.positionId
										: current.positionId,
								timeRange: {
									start: input.start ?? new Date(range.start).toISOString(),
									end: input.end ?? new Date(range.end).toISOString(),
								},
								isPreferredPosition:
									input.isPreferredPosition ?? current.isPreferredPosition,
								...(input.status ? { status: input.status } : {}),
							},
							input.shiftId,
							input.version,
						);
						return result.ok
							? ok({ shift: shiftView(result.shift) })
							: writeFailure(result);
					})
				: readOnlyConnection(),
	);

	server.registerTool(
		"delete_shift",
		{
			title: "Delete a shift",
			description:
				"Delete a shift (requires permission to edit shifts; confirmed shifts also need permission to confirm). " +
				"Pass the version from get_shift_board.",
			inputSchema: z.object({
				...shiftScopeInput,
				shiftId: z.uuid(),
				version: z.int().min(0),
			}),
			annotations: { ...writeHints, destructiveHint: true },
		},
		async (input) =>
			canWrite
				? guard(async () => {
						const access = await requireScopeAccess(
							userId,
							toShiftScope(input),
							"shift.view",
						);
						const result = await removeShift(
							writeAccessOf(access),
							input.shiftId,
							input.version,
						);
						return result.ok
							? ok({ deleted: shiftView(result.shift) })
							: writeFailure(result);
					})
				: readOnlyConnection(),
	);

	server.registerTool(
		"submit_my_preference",
		{
			title: "Submit my preference",
			description:
				"Submit or replace the signed-in user's own preference for the organization, a location, or an event: " +
				"preferred break times, preferred positions (ids from get_my_preference.selectablePositions), and a memo. " +
				"Rejected after the deadline unless the user can manage everyone's preferences.",
			inputSchema: z.object({
				...preferenceScopeInput,
				breaks: z
					.array(z.object({ start: isoDateTime, end: isoDateTime }))
					.default([]),
				positionIds: z.array(z.uuid()).default([]),
				memo: z.string().default(""),
			}),
			annotations: {
				...writeHints,
				destructiveHint: false,
				idempotentHint: true,
			},
		},
		async (input) =>
			canWrite
				? guard(async () => {
						const scope = toPreferenceScope(input);
						if (!scope) return failure("eventSlug requires tenantSlug.");
						const context = await requirePreferenceContext(
							userId,
							input.orgSlug,
							scope,
						);
						const myStaff = await findMyStaff(context);
						if (!myStaff) {
							return failure(
								"You are not linked to a staff member in this organization, so you cannot submit preferences here.",
							);
						}
						const result = await savePreference(context, myStaff.id, {
							breaks: input.breaks,
							positionIds: input.positionIds,
							memo: input.memo,
						});
						return result.ok
							? ok({ saved: true, scope: context.label })
							: failure("The preference was not saved.", result.errors);
					})
				: readOnlyConnection(),
	);

	return server;
};
