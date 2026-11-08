// 団体へのアクセスの確認。団体のデータを読み書きするときは、必ずここを通す。
// 所属していない団体は「存在しない」ものとして扱い（404）、団体があるかどうかも漏らさない
import {
	hasPermission,
	type Permission,
	permissionsOf,
} from "../lib/org/permissions";
import { prisma } from "../lib/prisma.server";

export type MemberRoleSummary = { id: string; name: string; color: string };

export type OrgMembership = {
	organization: { id: string; slug: string; name: string };
	member: {
		id: string;
		isOwner: boolean;
		displayName: string;
		/** 団体で持っているロール */
		roles: MemberRoleSummary[];
		/** 団体での権限（ロールの足し合わせ。オーナーは全権限） */
		permissions: Permission[];
	};
};

export class OrgAccessError extends Error {
	constructor(
		readonly status: 403 | 404,
		message: string,
	) {
		super(message);
		this.name = "OrgAccessError";
	}
}

/** その人のその団体での所属を返す。所属していなければ null */
export const findMembership = async (
	userId: string,
	orgSlug: string,
): Promise<OrgMembership | null> => {
	const member = await prisma.member.findFirst({
		where: { userId, organization: { slug: orgSlug } },
		select: {
			id: true,
			isOwner: true,
			displayName: true,
			organization: { select: { id: true, slug: true, name: true } },
			roles: {
				select: {
					role: {
						select: {
							id: true,
							name: true,
							color: true,
							permissions: true,
							sortOrder: true,
						},
					},
				},
			},
		},
	});
	if (!member) return null;
	const roles = member.roles
		.map((assignment) => assignment.role)
		.sort((a, b) => a.sortOrder - b.sortOrder);
	return {
		organization: member.organization,
		member: {
			id: member.id,
			isOwner: member.isOwner,
			displayName: member.displayName,
			roles: roles.map(({ id, name, color }) => ({ id, name, color })),
			permissions: permissionsOf(member.isOwner, roles),
		},
	};
};

/**
 * 団体のメンバーで、その権限を持っているかを確かめる。
 * 所属していなければ 404、権限が足りなければ 403 の OrgAccessError を投げる
 */
export const requireOrgAccess = async (
	userId: string,
	orgSlug: string,
	permission: Permission,
): Promise<OrgMembership> => {
	const membership = await findMembership(userId, orgSlug);
	if (!membership) throw new OrgAccessError(404, "Organization not found");
	if (!hasPermission(membership.member.permissions, permission)) {
		throw new OrgAccessError(403, "Forbidden");
	}
	return membership;
};

/** API 用：OrgAccessError を HTTP の応答にする（ほかのエラーは投げ直す） */
export const orgAccessErrorResponse = (error: unknown): Response => {
	if (error instanceof OrgAccessError) {
		return Response.json(
			{ message: error.status === 404 ? "Not found" : "Forbidden" },
			{ status: error.status },
		);
	}
	throw error;
};

/**
 * 団体の API（/api/o/$orgSlug/...）の handler を包む。ログインしていなければ 401、
 * 所属していなければ 404、権限が足りなければ 403 を返し、通れば handler に所属を渡す
 */
export const withOrgApi =
	<Ctx extends { request: Request; params: { orgSlug: string } }>(
		permission: Permission,
		handler: (
			ctx: Ctx & { membership: OrgMembership },
		) => Response | Promise<Response>,
	) =>
	async (ctx: Ctx): Promise<Response> => {
		const { getSessionUserFromHeaders } = await import("./session.server");
		const user = await getSessionUserFromHeaders(ctx.request.headers);
		if (!user)
			return Response.json({ message: "Unauthorized" }, { status: 401 });
		let membership: OrgMembership;
		try {
			membership = await requireOrgAccess(
				user.id,
				ctx.params.orgSlug,
				permission,
			);
		} catch (error) {
			return orgAccessErrorResponse(error);
		}
		return handler({ ...ctx, membership });
	};
