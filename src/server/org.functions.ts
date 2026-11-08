import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import {
	INVITE_DEFAULT_EXPIRES_DAYS,
	INVITE_DEFAULT_MAX_USES,
	INVITE_MAX_EXPIRES_DAYS,
	INVITE_MAX_USES_LIMIT,
} from "../lib/org/invite-code";
import {
	ALL_PERMISSIONS,
	canGrant,
	canInviteWith,
	type Permission,
	parsePermissions,
	permissionsOf,
} from "../lib/org/permissions";
import { orgNameSchema, slugSchema } from "../lib/org/slug";
import { prisma } from "../lib/prisma.server";
import { nameSchema } from "../lib/profile";
import { requireUserMiddleware } from "./auth-middleware";
import {
	findMembership,
	type OrgMembership,
	requireOrgAccess,
} from "./org-access.server";
import {
	acceptInvite,
	type Actor,
	createInvite,
	createOrganization,
	createRole,
	deleteRole,
	previewInvite,
	setMemberRoles,
	updateRole,
} from "./org.server";

// 団体まわりの server function。どれもログインが必要で、団体の中の操作は毎回メンバーかと権限を確かめる

type Errors = { ok: false; errors: string[] };
const errorsOf = (error: z.ZodError): Errors => ({
	ok: false,
	errors: error.issues.map((issue) => issue.message),
});

const slugParam = z.string().min(1);
const idParam = z.string().min(1);
const actorOf = (membership: OrgMembership): Actor => ({
	memberId: membership.member.id,
	isOwner: membership.member.isOwner,
	permissions: membership.member.permissions,
});

/** 自分が所属している団体の一覧 */
export const listMyOrganizations = createServerFn({ method: "GET" })
	.middleware([requireUserMiddleware])
	.handler(async ({ context }) => {
		const members = await prisma.member.findMany({
			where: { userId: context.user.id },
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
		return members.map((member) => ({
			slug: member.organization.slug,
			name: member.organization.name,
			isOwner: member.isOwner,
			roleNames: member.roles
				.map((r) => r.role)
				.sort((a, b) => a.sortOrder - b.sortOrder)
				.map((r) => r.name),
			displayName: member.displayName,
		}));
	});

/** 団体を作る（作った人がオーナー） */
export const createOrganizationFn = createServerFn({ method: "POST" })
	.middleware([requireUserMiddleware])
	.validator(
		(data: { name: unknown; slug: unknown; displayName: unknown }) => data,
	)
	.handler(async ({ data, context }) => {
		const parsed = z
			.object({
				name: orgNameSchema,
				slug: slugSchema,
				displayName: nameSchema,
			})
			.safeParse(data);
		if (!parsed.success) return errorsOf(parsed.error);
		return createOrganization({ userId: context.user.id, ...parsed.data });
	});

/**
 * 団体の画面の土台に使う情報（団体・自分のロールと権限・表示名・テナント）。
 * 所属していなければ null（画面は 404 にする）
 */
export const getOrganization = createServerFn({ method: "GET" })
	.middleware([requireUserMiddleware])
	.validator((data: { orgSlug: unknown }) => ({
		orgSlug: slugParam.parse(data.orgSlug),
	}))
	.handler(async ({ data, context }) => {
		const membership = await findMembership(context.user.id, data.orgSlug);
		if (!membership) return null;
		const tenants = await prisma.tenant.findMany({
			where: { organizationId: membership.organization.id },
			select: { slug: true, name: true },
			orderBy: { createdAt: "asc" },
		});
		return {
			organization: {
				slug: membership.organization.slug,
				name: membership.organization.name,
			},
			member: membership.member,
			// テナントが 1 つなら、テナントを選ぶ手順は出さない
			tenants,
		};
	});

/** この団体での自分の表示名を変える */
export const updateMyDisplayName = createServerFn({ method: "POST" })
	.middleware([requireUserMiddleware])
	.validator((data: { orgSlug: unknown; displayName: unknown }) => data)
	.handler(async ({ data, context }) => {
		const parsed = z
			.object({ orgSlug: slugParam, displayName: nameSchema })
			.safeParse(data);
		if (!parsed.success) return errorsOf(parsed.error);
		const membership = await findMembership(
			context.user.id,
			parsed.data.orgSlug,
		);
		if (!membership)
			return { ok: false as const, errors: ["団体が見つかりません"] };
		await prisma.member.update({
			where: { id: membership.member.id },
			data: { displayName: parsed.data.displayName },
		});
		return { ok: true as const };
	});

/** メンバーの一覧（member.view） */
export const listMembers = createServerFn({ method: "GET" })
	.middleware([requireUserMiddleware])
	.validator((data: { orgSlug: unknown }) => ({
		orgSlug: slugParam.parse(data.orgSlug),
	}))
	.handler(async ({ data, context }) => {
		const access = await requireOrgAccess(
			context.user.id,
			data.orgSlug,
			"member.view",
		);
		const members = await prisma.member.findMany({
			where: { organizationId: access.organization.id },
			select: {
				id: true,
				isOwner: true,
				displayName: true,
				createdAt: true,
				roles: { select: { roleId: true } },
			},
			orderBy: { createdAt: "asc" },
		});
		return members.map((member) => ({
			id: member.id,
			isOwner: member.isOwner,
			displayName: member.displayName,
			roleIds: member.roles.map((r) => r.roleId),
			isMe: member.id === access.member.id,
		}));
	});

/** メンバーのロールを付け直す（member.manage。自分が持っている権限の範囲のロールだけ） */
export const setMemberRolesFn = createServerFn({ method: "POST" })
	.middleware([requireUserMiddleware])
	.validator(
		(data: { orgSlug: unknown; memberId: unknown; roleIds: unknown }) => ({
			orgSlug: slugParam.parse(data.orgSlug),
			memberId: idParam.parse(data.memberId),
			roleIds: z.array(idParam).max(50).parse(data.roleIds),
		}),
	)
	.handler(async ({ data, context }) => {
		const access = await requireOrgAccess(
			context.user.id,
			data.orgSlug,
			"member.manage",
		);
		return setMemberRoles(
			access.organization.id,
			actorOf(access),
			data.memberId,
			data.roleIds,
		);
	});

/** メンバーを団体から外す（member.manage。オーナーと、自分より強いロールを持つ人は外せない） */
export const removeMember = createServerFn({ method: "POST" })
	.middleware([requireUserMiddleware])
	.validator((data: { orgSlug: unknown; memberId: unknown }) => ({
		orgSlug: slugParam.parse(data.orgSlug),
		memberId: idParam.parse(data.memberId),
	}))
	.handler(async ({ data, context }) => {
		const access = await requireOrgAccess(
			context.user.id,
			data.orgSlug,
			"member.manage",
		);
		const target = await prisma.member.findFirst({
			where: { id: data.memberId, organizationId: access.organization.id },
			select: {
				id: true,
				isOwner: true,
				roles: { select: { role: { select: { permissions: true } } } },
			},
		});
		if (!target)
			return { ok: false as const, errors: ["メンバーが見つかりません"] };
		if (target.isOwner)
			return { ok: false as const, errors: ["オーナーは外せません"] };
		const targetPermissions = permissionsOf(
			false,
			target.roles.map((r) => r.role),
		);
		if (!canGrant(access.member.permissions, targetPermissions)) {
			return {
				ok: false as const,
				errors: ["自分が持っていない権限を持つメンバーは外せません"],
			};
		}
		await prisma.member.delete({ where: { id: target.id } });
		return { ok: true as const };
	});

// ---- ロール ----

const permissionsSchema = z
	.array(z.enum(ALL_PERMISSIONS as [Permission, ...Permission[]]))
	.transform((list) => [...new Set(list)]);
const roleInputSchema = z.object({
	name: z
		.string()
		.trim()
		.min(1, "ロール名を入力してください")
		.max(40, "ロール名は 40 文字までにしてください"),
	color: z
		.string()
		.regex(/^#[0-9a-fA-F]{6}$/, "色は #RRGGBB の形で指定してください"),
	permissions: permissionsSchema,
});

/** ロールの一覧（メンバーなら見られる。ロールの付け外しや招待コードの画面で使う） */
export const listRoles = createServerFn({ method: "GET" })
	.middleware([requireUserMiddleware])
	.validator((data: { orgSlug: unknown }) => ({
		orgSlug: slugParam.parse(data.orgSlug),
	}))
	.handler(async ({ data, context }) => {
		const access = await requireOrgAccess(
			context.user.id,
			data.orgSlug,
			"member.view",
		);
		const roles = await prisma.orgRole.findMany({
			where: { organizationId: access.organization.id },
			select: {
				id: true,
				name: true,
				color: true,
				permissions: true,
				_count: { select: { members: true } },
			},
			orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
		});
		return roles.map((role) => {
			const permissions = parsePermissions(role.permissions);
			return {
				id: role.id,
				name: role.name,
				color: role.color,
				permissions,
				memberCount: role._count.members,
				// 自分が持っている権限の範囲のロールだけ、付け外し・編集できる
				grantable: canGrant(access.member.permissions, permissions),
				// 招待で渡せるか（「ゲストを招待する」がある人は、Discord の条件の免除を含むロールも）
				invitable: canInviteWith(access.member.permissions, permissions),
			};
		});
	});

/** ロールを作る（role.manage。自分が持っている権限の範囲だけ） */
export const createRoleFn = createServerFn({ method: "POST" })
	.middleware([requireUserMiddleware])
	.validator((data: { orgSlug: unknown; role: unknown }) => data)
	.handler(async ({ data, context }) => {
		const orgSlug = slugParam.parse(data.orgSlug);
		const parsed = roleInputSchema.safeParse(data.role);
		if (!parsed.success) return errorsOf(parsed.error);
		const access = await requireOrgAccess(
			context.user.id,
			orgSlug,
			"role.manage",
		);
		return createRole(access.organization.id, actorOf(access), parsed.data);
	});

/** ロールを変える（role.manage。自分より強いロールは変えられない） */
export const updateRoleFn = createServerFn({ method: "POST" })
	.middleware([requireUserMiddleware])
	.validator(
		(data: { orgSlug: unknown; roleId: unknown; role: unknown }) => data,
	)
	.handler(async ({ data, context }) => {
		const orgSlug = slugParam.parse(data.orgSlug);
		const roleId = idParam.parse(data.roleId);
		const parsed = roleInputSchema.safeParse(data.role);
		if (!parsed.success) return errorsOf(parsed.error);
		const access = await requireOrgAccess(
			context.user.id,
			orgSlug,
			"role.manage",
		);
		return updateRole(
			access.organization.id,
			actorOf(access),
			roleId,
			parsed.data,
		);
	});

/** ロールを消す（role.manage。自分より強いロールは消せない） */
export const deleteRoleFn = createServerFn({ method: "POST" })
	.middleware([requireUserMiddleware])
	.validator((data: { orgSlug: unknown; roleId: unknown }) => ({
		orgSlug: slugParam.parse(data.orgSlug),
		roleId: idParam.parse(data.roleId),
	}))
	.handler(async ({ data, context }) => {
		const access = await requireOrgAccess(
			context.user.id,
			data.orgSlug,
			"role.manage",
		);
		return deleteRole(access.organization.id, actorOf(access), data.roleId);
	});

// ---- 招待コード ----

/** 招待コードの一覧（invite.manage） */
export const listInvites = createServerFn({ method: "GET" })
	.middleware([requireUserMiddleware])
	.validator((data: { orgSlug: unknown }) => ({
		orgSlug: slugParam.parse(data.orgSlug),
	}))
	.handler(async ({ data, context }) => {
		const access = await requireOrgAccess(
			context.user.id,
			data.orgSlug,
			"invite.manage",
		);
		return prisma.invite.findMany({
			where: { organizationId: access.organization.id },
			select: {
				id: true,
				code: true,
				maxUses: true,
				uses: true,
				expiresAt: true,
				revokedAt: true,
				createdAt: true,
				role: { select: { id: true, name: true, color: true } },
			},
			orderBy: { createdAt: "desc" },
			take: 50,
		});
	});

/** 招待コードを発行する（invite.manage。付けるロールは、自分が持っている権限の範囲のものだけ） */
export const createInviteFn = createServerFn({ method: "POST" })
	.middleware([requireUserMiddleware])
	.validator(
		(data: {
			orgSlug: unknown;
			roleId: unknown;
			maxUses: unknown;
			expiresInDays: unknown;
		}) => data,
	)
	.handler(async ({ data, context }) => {
		const parsed = z
			.object({
				orgSlug: slugParam,
				roleId: idParam,
				// null は回数の制限なし
				maxUses: z
					.number()
					.int()
					.min(1)
					.max(INVITE_MAX_USES_LIMIT)
					.nullable()
					.default(INVITE_DEFAULT_MAX_USES),
				expiresInDays: z
					.number()
					.int()
					.min(1)
					.max(INVITE_MAX_EXPIRES_DAYS)
					.default(INVITE_DEFAULT_EXPIRES_DAYS),
			})
			.safeParse(data);
		if (!parsed.success) return errorsOf(parsed.error);
		const access = await requireOrgAccess(
			context.user.id,
			parsed.data.orgSlug,
			"invite.manage",
		);
		return createInvite({
			organizationId: access.organization.id,
			actor: actorOf(access),
			createdById: context.user.id,
			roleId: parsed.data.roleId,
			maxUses: parsed.data.maxUses,
			expiresInDays: parsed.data.expiresInDays,
		});
	});

/** 招待コードを取り消す（invite.manage） */
export const revokeInvite = createServerFn({ method: "POST" })
	.middleware([requireUserMiddleware])
	.validator((data: { orgSlug: unknown; inviteId: unknown }) => ({
		orgSlug: slugParam.parse(data.orgSlug),
		inviteId: idParam.parse(data.inviteId),
	}))
	.handler(async ({ data, context }) => {
		const access = await requireOrgAccess(
			context.user.id,
			data.orgSlug,
			"invite.manage",
		);
		const result = await prisma.invite.updateMany({
			where: {
				id: data.inviteId,
				organizationId: access.organization.id,
				revokedAt: null,
			},
			data: { revokedAt: new Date() },
		});
		return { ok: result.count > 0 };
	});

/** 招待コードを確かめる（参加する前に、どの団体に、どのロールで参加するかを見せる） */
export const previewInviteFn = createServerFn({ method: "GET" })
	.middleware([requireUserMiddleware])
	.validator((data: { code: unknown }) => ({
		code: typeof data.code === "string" ? data.code : "",
	}))
	.handler(({ data, context }) => previewInvite(context.user.id, data.code));

/** 招待コードで団体に参加する */
export const acceptInviteFn = createServerFn({ method: "POST" })
	.middleware([requireUserMiddleware])
	.validator((data: { code: unknown; displayName: unknown }) => data)
	.handler(async ({ data, context }) => {
		const parsed = z
			.object({ code: z.string().min(1), displayName: nameSchema })
			.safeParse(data);
		if (!parsed.success) return errorsOf(parsed.error);
		return acceptInvite({ userId: context.user.id, ...parsed.data });
	});
