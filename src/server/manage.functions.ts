import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import {
	eventInputSchema,
	positionInputSchema,
	staffInputSchema,
	tenantInputSchema,
} from "../lib/manage-schemas";
import { canGrant, parsePermissions } from "../lib/org/permissions";
import { prisma } from "../lib/prisma.server";
import type { ShiftScopeParams } from "../lib/shift-scope";
import { requireUserMiddleware } from "./auth-middleware";
import { type OrgMembership, requireOrgAccess } from "./org-access.server";
import {
	createEvent,
	createPosition,
	createStaff,
	createTenant,
	deleteEvent,
	deletePosition,
	deleteStaff,
	setScopedRoles,
	updateEvent,
	updatePosition,
	updateStaff,
	updateTenant,
} from "./manage.server";
import { requireScopeAccess, type ScopeAccess } from "./scope-access.server";

// 管理の画面から呼ぶ server function。どれもログインが必要で、メンバーかとその単位での権限を毎回確かめる

type Errors = { ok: false; errors: string[] };
const errorsOf = (error: z.ZodError): Errors => ({
	ok: false,
	errors: error.issues.map((issue) => issue.message),
});
const slug = z.string().min(1);
const id = z.string().min(1);
const scopeSchema = z.object({
	orgSlug: slug,
	tenantSlug: slug,
	eventSlug: slug.nullish(),
});
const idsOf = (access: ScopeAccess) => ({
	organizationId: access.organization.id,
	tenantId: access.tenant.id,
	eventId: access.event?.id ?? null,
});
const actorOf = (membership: OrgMembership) => ({
	memberId: membership.member.id,
	isOwner: membership.member.isOwner,
	permissions: membership.member.permissions,
});

// ---- テナント（テナントの管理） ----

export const createTenantFn = createServerFn({ method: "POST" })
	.middleware([requireUserMiddleware])
	.validator((data: { orgSlug: unknown; tenant: unknown }) => data)
	.handler(async ({ data, context }) => {
		const orgSlug = slug.parse(data.orgSlug);
		const parsed = tenantInputSchema.safeParse(data.tenant);
		if (!parsed.success) return errorsOf(parsed.error);
		const access = await requireOrgAccess(
			context.user.id,
			orgSlug,
			"tenant.manage",
		);
		return createTenant(access.organization.id, parsed.data);
	});

export const updateTenantFn = createServerFn({ method: "POST" })
	.middleware([requireUserMiddleware])
	.validator(
		(data: { orgSlug: unknown; tenantSlug: unknown; tenant: unknown }) => data,
	)
	.handler(async ({ data, context }) => {
		const scope = scopeSchema.parse({
			orgSlug: data.orgSlug,
			tenantSlug: data.tenantSlug,
		});
		const parsed = tenantInputSchema.safeParse(data.tenant);
		if (!parsed.success) return errorsOf(parsed.error);
		// テナントがこの団体にあるか（404）と、団体でテナントの管理の権限があるか（403）を確かめる
		const access = await requireScopeAccess(
			context.user.id,
			scope,
			"shift.view",
		);
		await requireOrgAccess(context.user.id, scope.orgSlug, "tenant.manage");
		return updateTenant(access.organization.id, access.tenant.id, parsed.data);
	});

// ---- イベント（そのテナント・イベントでのイベントの管理） ----

export const createEventFn = createServerFn({ method: "POST" })
	.middleware([requireUserMiddleware])
	.validator(
		(data: { orgSlug: unknown; tenantSlug: unknown; event: unknown }) => data,
	)
	.handler(async ({ data, context }) => {
		const scope = scopeSchema.parse({
			orgSlug: data.orgSlug,
			tenantSlug: data.tenantSlug,
		});
		const parsed = eventInputSchema.safeParse(data.event);
		if (!parsed.success) return errorsOf(parsed.error);
		const access = await requireScopeAccess(
			context.user.id,
			scope,
			"event.manage",
		);
		return createEvent(
			{ organizationId: access.organization.id, tenantId: access.tenant.id },
			parsed.data,
		);
	});

export const updateEventFn = createServerFn({ method: "POST" })
	.middleware([requireUserMiddleware])
	.validator((data: ShiftScopeParams & { event: unknown }) => data)
	.handler(async ({ data, context }) => {
		const scope = scopeSchema.required({ eventSlug: true }).parse(data);
		const parsed = eventInputSchema.safeParse(data.event);
		if (!parsed.success) return errorsOf(parsed.error);
		const access = await requireScopeAccess(
			context.user.id,
			scope,
			"event.manage",
		);
		if (!access.event)
			return { ok: false as const, errors: ["イベントが見つかりません"] };
		return updateEvent(
			{ organizationId: access.organization.id, tenantId: access.tenant.id },
			access.event.id,
			parsed.data,
		);
	});

export const deleteEventFn = createServerFn({ method: "POST" })
	.middleware([requireUserMiddleware])
	.validator((data: ShiftScopeParams) =>
		scopeSchema.required({ eventSlug: true }).parse(data),
	)
	.handler(async ({ data, context }) => {
		const access = await requireScopeAccess(
			context.user.id,
			data,
			"event.manage",
		);
		if (!access.event)
			return { ok: false as const, errors: ["イベントが見つかりません"] };
		return deleteEvent(
			{ organizationId: access.organization.id, tenantId: access.tenant.id },
			access.event.id,
		);
	});

// ---- 持ち場（その単位での持ち場の管理） ----

export const createPositionFn = createServerFn({ method: "POST" })
	.middleware([requireUserMiddleware])
	.validator((data: { scope: unknown; position: unknown }) => data)
	.handler(async ({ data, context }) => {
		const scope = scopeSchema.parse(data.scope);
		const parsed = positionInputSchema.safeParse(data.position);
		if (!parsed.success) return errorsOf(parsed.error);
		const access = await requireScopeAccess(
			context.user.id,
			scope,
			"position.manage",
		);
		return createPosition(idsOf(access), parsed.data);
	});

export const updatePositionFn = createServerFn({ method: "POST" })
	.middleware([requireUserMiddleware])
	.validator(
		(data: { scope: unknown; positionId: unknown; position: unknown }) => data,
	)
	.handler(async ({ data, context }) => {
		const scope = scopeSchema.parse(data.scope);
		const positionId = id.parse(data.positionId);
		const parsed = positionInputSchema.safeParse(data.position);
		if (!parsed.success) return errorsOf(parsed.error);
		const access = await requireScopeAccess(
			context.user.id,
			scope,
			"position.manage",
		);
		return updatePosition(idsOf(access), positionId, parsed.data);
	});

export const deletePositionFn = createServerFn({ method: "POST" })
	.middleware([requireUserMiddleware])
	.validator((data: { scope: unknown; positionId: unknown }) => ({
		scope: scopeSchema.parse(data.scope),
		positionId: id.parse(data.positionId),
	}))
	.handler(async ({ data, context }) => {
		const access = await requireScopeAccess(
			context.user.id,
			data.scope,
			"position.manage",
		);
		return deletePosition(idsOf(access), data.positionId);
	});

// ---- スタッフ（スタッフの管理） ----

export const listStaffFn = createServerFn({ method: "GET" })
	.middleware([requireUserMiddleware])
	.validator((data: { orgSlug: unknown }) => ({
		orgSlug: slug.parse(data.orgSlug),
	}))
	.handler(async ({ data, context }) => {
		const access = await requireOrgAccess(
			context.user.id,
			data.orgSlug,
			"staff.manage",
		);
		const [staffs, members] = await Promise.all([
			prisma.staff.findMany({
				where: { organizationId: access.organization.id },
				select: {
					id: true,
					name: true,
					memberId: true,
					_count: { select: { shifts: true } },
				},
				orderBy: { name: "asc" },
			}),
			prisma.member.findMany({
				where: { organizationId: access.organization.id },
				select: { id: true, displayName: true },
				orderBy: { createdAt: "asc" },
			}),
		]);
		return {
			staffs: staffs.map((s) => ({
				id: s.id,
				name: s.name,
				memberId: s.memberId,
				shiftCount: s._count.shifts,
			})),
			members,
		};
	});

export const createStaffFn = createServerFn({ method: "POST" })
	.middleware([requireUserMiddleware])
	.validator((data: { orgSlug: unknown; staff: unknown }) => data)
	.handler(async ({ data, context }) => {
		const orgSlug = slug.parse(data.orgSlug);
		const parsed = staffInputSchema.safeParse(data.staff);
		if (!parsed.success) return errorsOf(parsed.error);
		const access = await requireOrgAccess(
			context.user.id,
			orgSlug,
			"staff.manage",
		);
		return createStaff(access.organization.id, parsed.data);
	});

export const updateStaffFn = createServerFn({ method: "POST" })
	.middleware([requireUserMiddleware])
	.validator(
		(data: { orgSlug: unknown; staffId: unknown; staff: unknown }) => data,
	)
	.handler(async ({ data, context }) => {
		const orgSlug = slug.parse(data.orgSlug);
		const staffId = id.parse(data.staffId);
		const parsed = staffInputSchema.safeParse(data.staff);
		if (!parsed.success) return errorsOf(parsed.error);
		const access = await requireOrgAccess(
			context.user.id,
			orgSlug,
			"staff.manage",
		);
		return updateStaff(access.organization.id, staffId, parsed.data);
	});

export const deleteStaffFn = createServerFn({ method: "POST" })
	.middleware([requireUserMiddleware])
	.validator((data: { orgSlug: unknown; staffId: unknown }) => ({
		orgSlug: slug.parse(data.orgSlug),
		staffId: id.parse(data.staffId),
	}))
	.handler(async ({ data, context }) => {
		const access = await requireOrgAccess(
			context.user.id,
			data.orgSlug,
			"staff.manage",
		);
		return deleteStaff(access.organization.id, data.staffId);
	});

// ---- テナント・イベントでのロールの割り当て（メンバーの管理） ----

/** テナント（eventSlug なし）またはイベントでの、メンバーごとの割り当てとロールの一覧 */
export const getScopedRoleAssignments = createServerFn({ method: "GET" })
	.middleware([requireUserMiddleware])
	.validator((data: ShiftScopeParams) => scopeSchema.parse(data))
	.handler(async ({ data, context }) => {
		const membership = await requireOrgAccess(
			context.user.id,
			data.orgSlug,
			"member.manage",
		);
		const access = await requireScopeAccess(
			context.user.id,
			data,
			"shift.view",
		);
		const [members, roles, assignments] = await Promise.all([
			prisma.member.findMany({
				where: { organizationId: access.organization.id },
				select: { id: true, displayName: true, isOwner: true },
				orderBy: { createdAt: "asc" },
			}),
			prisma.orgRole.findMany({
				where: { organizationId: access.organization.id },
				select: { id: true, name: true, color: true, permissions: true },
				orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
			}),
			access.event
				? prisma.eventMember.findMany({
						where: { eventId: access.event.id },
						select: { memberId: true, roleId: true },
					})
				: prisma.tenantMember.findMany({
						where: { tenantId: access.tenant.id },
						select: { memberId: true, roleId: true },
					}),
		]);
		return {
			members: members.map((m) => ({
				...m,
				roleIds: assignments
					.filter((a) => a.memberId === m.id)
					.map((a) => a.roleId),
			})),
			roles: roles.map((role) => ({
				id: role.id,
				name: role.name,
				color: role.color,
				grantable: canGrant(
					membership.member.permissions,
					parsePermissions(role.permissions),
				),
			})),
		};
	});

export const setScopedRolesFn = createServerFn({ method: "POST" })
	.middleware([requireUserMiddleware])
	.validator(
		(data: ShiftScopeParams & { memberId: unknown; roleIds: unknown }) => ({
			scope: scopeSchema.parse(data),
			memberId: id.parse(data.memberId),
			roleIds: z.array(id).max(50).parse(data.roleIds),
		}),
	)
	.handler(async ({ data, context }) => {
		const membership = await requireOrgAccess(
			context.user.id,
			data.scope.orgSlug,
			"member.manage",
		);
		const access = await requireScopeAccess(
			context.user.id,
			data.scope,
			"shift.view",
		);
		return setScopedRoles(
			access.organization.id,
			actorOf(membership),
			{ tenantId: access.tenant.id, eventId: access.event?.id ?? null },
			data.memberId,
			data.roleIds,
		);
	});
