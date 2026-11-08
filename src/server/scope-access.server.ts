// テナント・イベントの単位でのアクセスの確認。シフトを読み書きするときは、必ずここを通す。
// 団体のメンバーで、そのテナント（とイベント）がその団体の下にあり、
// 「団体・テナント・イベントの役割のうち強いもの」でその操作をしてよいかを確かめる
import { prisma } from "../lib/prisma.server";
import {
	can,
	type MemberRole,
	type OrgAction,
	strongestRole,
} from "../lib/org/permissions";
import {
	findMembership,
	type OrgMembership,
	OrgAccessError,
} from "./org-access.server";

import type { ShiftScopeParams } from "../lib/shift-scope";

export type { ShiftScopeParams };

export type ScopeAccess = OrgMembership & {
	tenant: { id: string; slug: string; name: string; timeUnitMinutes: number };
	event: {
		id: string;
		slug: string;
		name: string;
		timeUnitMinutes: number | null;
	} | null;
	/** 団体・テナント・イベントの役割のうち、いちばん強いもの */
	role: MemberRole;
	/** この単位で使う時間粒度（イベントの上書きがあればそれ、なければテナントの値） */
	timeUnitMinutes: number;
};

/** 所属・テナント・イベントを調べ、この単位での役割を返す。どれかが見つからなければ null */
export const findScopeAccess = async (
	userId: string,
	scope: ShiftScopeParams,
): Promise<ScopeAccess | null> => {
	const membership = await findMembership(userId, scope.orgSlug);
	if (!membership) return null;

	const tenant = await prisma.tenant.findFirst({
		where: {
			organizationId: membership.organization.id,
			slug: scope.tenantSlug,
		},
		select: {
			id: true,
			slug: true,
			name: true,
			timeUnitMinutes: true,
			members: {
				where: { memberId: membership.member.id },
				select: { role: true },
			},
		},
	});
	if (!tenant) return null;

	let event: ScopeAccess["event"] = null;
	let eventRole: MemberRole | undefined;
	if (scope.eventSlug) {
		const found = await prisma.event.findFirst({
			where: { tenantId: tenant.id, slug: scope.eventSlug },
			select: {
				id: true,
				slug: true,
				name: true,
				timeUnitMinutes: true,
				members: {
					where: { memberId: membership.member.id },
					select: { role: true },
				},
			},
		});
		if (!found) return null;
		event = {
			id: found.id,
			slug: found.slug,
			name: found.name,
			timeUnitMinutes: found.timeUnitMinutes,
		};
		eventRole = found.members[0]?.role;
	}

	return {
		...membership,
		tenant: {
			id: tenant.id,
			slug: tenant.slug,
			name: tenant.name,
			timeUnitMinutes: tenant.timeUnitMinutes,
		},
		event,
		role: strongestRole(
			membership.member.role,
			tenant.members[0]?.role,
			eventRole,
		),
		timeUnitMinutes: event?.timeUnitMinutes ?? tenant.timeUnitMinutes,
	};
};

/**
 * この単位でその操作をしてよいかを確かめる。
 * 所属していない・テナントやイベントがその団体にない → 404、権限が足りない → 403
 */
export const requireScopeAccess = async (
	userId: string,
	scope: ShiftScopeParams,
	action: OrgAction,
): Promise<ScopeAccess> => {
	const access = await findScopeAccess(userId, scope);
	if (!access) throw new OrgAccessError(404, "Not found");
	if (!can(access.role, action)) throw new OrgAccessError(403, "Forbidden");
	return access;
};
