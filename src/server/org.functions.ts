import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import {
	INVITE_DEFAULT_EXPIRES_DAYS,
	INVITE_DEFAULT_MAX_USES,
	INVITE_MAX_EXPIRES_DAYS,
	INVITE_MAX_USES_LIMIT,
} from "../lib/org/invite-code";
import {
	assignableInviteRoles,
	assignableMemberRoles,
	can,
	MEMBER_ROLES,
	type MemberRole,
} from "../lib/org/permissions";
import { orgNameSchema, slugSchema } from "../lib/org/slug";
import { prisma } from "../lib/prisma.server";
import { nameSchema } from "../lib/profile";
import { requireUserMiddleware } from "./auth-middleware";
import { findMembership, requireOrgAccess } from "./org-access.server";
import {
	acceptInvite,
	createInvite,
	createOrganization,
	previewInvite,
} from "./org.server";

// 団体まわりの server function。どれもログインが必要で、団体の中の操作は毎回メンバーかと権限を確かめる

type Errors = { ok: false; errors: string[] };
const errorsOf = (error: z.ZodError): Errors => ({
	ok: false,
	errors: error.issues.map((issue) => issue.message),
});

const slugParam = z.string().min(1);

/** 自分が所属している団体の一覧 */
export const listMyOrganizations = createServerFn({ method: "GET" })
	.middleware([requireUserMiddleware])
	.handler(async ({ context }) => {
		const members = await prisma.member.findMany({
			where: { userId: context.user.id },
			select: {
				role: true,
				displayName: true,
				organization: { select: { slug: true, name: true } },
			},
			orderBy: { createdAt: "asc" },
		});
		return members.map((member) => ({
			slug: member.organization.slug,
			name: member.organization.name,
			role: member.role as MemberRole,
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
 * 団体の画面の土台に使う情報（団体と、自分の役割・表示名）。
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
		return {
			organization: {
				slug: membership.organization.slug,
				name: membership.organization.name,
			},
			member: membership.member,
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
		const access = await requireOrgAccess(
			context.user.id,
			parsed.data.orgSlug,
			"shift.view",
		);
		await prisma.member.update({
			where: { id: access.member.id },
			data: { displayName: parsed.data.displayName },
		});
		return { ok: true as const };
	});

/** メンバーの一覧（メンバーなら誰でも見られる） */
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
			select: { id: true, role: true, displayName: true, createdAt: true },
			orderBy: { createdAt: "asc" },
		});
		return members.map((member) => ({
			...member,
			role: member.role as MemberRole,
			isMe: member.id === access.member.id,
		}));
	});

/** メンバーの役割を変える（オーナーだけ。オーナーの受け渡しはしない） */
export const changeMemberRole = createServerFn({ method: "POST" })
	.middleware([requireUserMiddleware])
	.validator(
		(data: { orgSlug: unknown; memberId: unknown; role: unknown }) => data,
	)
	.handler(async ({ data, context }) => {
		const parsed = z
			.object({
				orgSlug: slugParam,
				memberId: z.string().min(1),
				role: z.enum(assignableMemberRoles as [MemberRole, ...MemberRole[]]),
			})
			.safeParse(data);
		if (!parsed.success) return errorsOf(parsed.error);
		const access = await requireOrgAccess(
			context.user.id,
			parsed.data.orgSlug,
			"member.manage",
		);
		const target = await prisma.member.findFirst({
			where: {
				id: parsed.data.memberId,
				organizationId: access.organization.id,
			},
			select: { id: true, role: true },
		});
		if (!target)
			return { ok: false as const, errors: ["メンバーが見つかりません"] };
		if (target.role === "owner") {
			return { ok: false as const, errors: ["オーナーの役割は変えられません"] };
		}
		await prisma.member.update({
			where: { id: target.id },
			data: { role: parsed.data.role },
		});
		return { ok: true as const };
	});

/** メンバーを団体から外す（オーナーだけ。オーナーは外せない） */
export const removeMember = createServerFn({ method: "POST" })
	.middleware([requireUserMiddleware])
	.validator((data: { orgSlug: unknown; memberId: unknown }) => ({
		orgSlug: slugParam.parse(data.orgSlug),
		memberId: z.string().min(1).parse(data.memberId),
	}))
	.handler(async ({ data, context }) => {
		const access = await requireOrgAccess(
			context.user.id,
			data.orgSlug,
			"member.manage",
		);
		const target = await prisma.member.findFirst({
			where: { id: data.memberId, organizationId: access.organization.id },
			select: { id: true, role: true },
		});
		if (!target)
			return { ok: false as const, errors: ["メンバーが見つかりません"] };
		if (target.role === "owner") {
			return { ok: false as const, errors: ["オーナーは外せません"] };
		}
		await prisma.member.delete({ where: { id: target.id } });
		return { ok: true as const };
	});

/** 招待コードの一覧（リーダー以上） */
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
		const invites = await prisma.invite.findMany({
			where: { organizationId: access.organization.id },
			select: {
				id: true,
				code: true,
				role: true,
				maxUses: true,
				uses: true,
				expiresAt: true,
				revokedAt: true,
				createdAt: true,
			},
			orderBy: { createdAt: "desc" },
			take: 50,
		});
		return {
			invites: invites.map((invite) => ({
				...invite,
				role: invite.role as MemberRole,
			})),
			assignableRoles: assignableInviteRoles(access.member.role),
		};
	});

/** 招待コードを発行する（リーダー以上。渡せる役割は、発行する人の役割で決まる） */
export const createInviteFn = createServerFn({ method: "POST" })
	.middleware([requireUserMiddleware])
	.validator(
		(data: {
			orgSlug: unknown;
			role: unknown;
			maxUses: unknown;
			expiresInDays: unknown;
		}) => data,
	)
	.handler(async ({ data, context }) => {
		const parsed = z
			.object({
				orgSlug: slugParam,
				role: z.enum(MEMBER_ROLES).default("staff"),
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
		if (!assignableInviteRoles(access.member.role).includes(parsed.data.role)) {
			return {
				ok: false as const,
				errors: ["その役割の招待コードは発行できません"],
			};
		}
		const invite = await createInvite({
			organizationId: access.organization.id,
			createdById: context.user.id,
			role: parsed.data.role,
			maxUses: parsed.data.maxUses,
			expiresInDays: parsed.data.expiresInDays,
		});
		return { ok: true as const, code: invite.code };
	});

/** 招待コードを取り消す（リーダー以上） */
export const revokeInvite = createServerFn({ method: "POST" })
	.middleware([requireUserMiddleware])
	.validator((data: { orgSlug: unknown; inviteId: unknown }) => ({
		orgSlug: slugParam.parse(data.orgSlug),
		inviteId: z.string().min(1).parse(data.inviteId),
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

/** 招待コードを確かめる（参加する前に、どの団体かを見せる） */
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

/** 画面の出し分けに使う（守りはサーバー側の requireOrgAccess） */
export { can };
