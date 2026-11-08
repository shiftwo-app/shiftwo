// 団体へのアクセスの確認。団体のデータを読み書きするときは、必ずここを通す。
// 所属していない団体は「存在しない」ものとして扱い（404）、団体があるかどうかも漏らさない
import { prisma } from "../lib/prisma.server";
import { can, type MemberRole, type OrgAction } from "../lib/org/permissions";

export type OrgMembership = {
	organization: { id: string; slug: string; name: string };
	member: { id: string; role: MemberRole; displayName: string };
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
			role: true,
			displayName: true,
			organization: { select: { id: true, slug: true, name: true } },
		},
	});
	if (!member) return null;
	return {
		organization: member.organization,
		member: {
			id: member.id,
			role: member.role,
			displayName: member.displayName,
		},
	};
};

/**
 * 団体のメンバーで、その操作をしてよいかを確かめる。
 * 所属していなければ 404、権限が足りなければ 403 の OrgAccessError を投げる
 */
export const requireOrgAccess = async (
	userId: string,
	orgSlug: string,
	action: OrgAction,
): Promise<OrgMembership> => {
	const membership = await findMembership(userId, orgSlug);
	if (!membership) throw new OrgAccessError(404, "Organization not found");
	if (!can(membership.member.role, action)) {
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
		action: OrgAction,
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
			membership = await requireOrgAccess(user.id, ctx.params.orgSlug, action);
		} catch (error) {
			return orgAccessErrorResponse(error);
		}
		return handler({ ...ctx, membership });
	};
