// 団体の作成・招待コード・メンバーの操作（サーバー専用）。権限の確認は呼ぶ側（org.functions.ts）で行う
import {
	generateInviteCode,
	INVITE_DEFAULT_EXPIRES_DAYS,
	type InviteUnusableReason,
	inviteUnusableReason,
	isWellFormedInviteCode,
	normalizeInviteCode,
} from "../lib/org/invite-code";
import type { MemberRole } from "../lib/org/permissions";
import { isPrismaError, PRISMA_ERROR } from "../lib/prisma-errors";
import { prisma } from "../lib/prisma.server";

const DAY_MS = 24 * 60 * 60 * 1000;
/** 新しいテナントの時間粒度の既定（分） */
export const DEFAULT_TIME_UNIT_MINUTES = 15;
/** 団体を作ったときに 1 つ作るテナントの URL 名 */
export const DEFAULT_TENANT_SLUG = "main";

export type CreateOrganizationResult =
	| { ok: true; slug: string }
	| { ok: false; errors: string[] };

/** 団体を作り、作った人をオーナーにする。テナントも 1 つ作る（店舗が 1 つなら、そのまま使える） */
export const createOrganization = async (input: {
	userId: string;
	name: string;
	slug: string;
	displayName: string;
}): Promise<CreateOrganizationResult> => {
	try {
		const organization = await prisma.organization.create({
			data: {
				name: input.name,
				slug: input.slug,
				members: {
					create: {
						userId: input.userId,
						role: "owner",
						displayName: input.displayName,
					},
				},
				tenants: {
					create: {
						slug: DEFAULT_TENANT_SLUG,
						name: input.name,
						timeUnitMinutes: DEFAULT_TIME_UNIT_MINUTES,
					},
				},
			},
			select: { slug: true },
		});
		return { ok: true, slug: organization.slug };
	} catch (error) {
		if (isPrismaError(error, PRISMA_ERROR.uniqueViolation)) {
			return { ok: false, errors: ["この URL はすでに使われています"] };
		}
		throw error;
	}
};

/** 招待コードを発行する。コードが重なったら作り直す */
export const createInvite = async (input: {
	organizationId: string;
	createdById: string;
	role: MemberRole;
	maxUses: number | null;
	expiresInDays: number;
	now?: Date;
}) => {
	const now = input.now ?? new Date();
	for (let attempt = 0; attempt < 5; attempt++) {
		try {
			return await prisma.invite.create({
				data: {
					organizationId: input.organizationId,
					createdById: input.createdById,
					code: generateInviteCode(),
					role: input.role,
					maxUses: input.maxUses,
					expiresAt: new Date(now.getTime() + input.expiresInDays * DAY_MS),
				},
			});
		} catch (error) {
			if (!isPrismaError(error, PRISMA_ERROR.uniqueViolation)) throw error;
		}
	}
	throw new Error("招待コードを作れませんでした");
};

export type InvitePreview =
	| {
			ok: true;
			organizationName: string;
			organizationSlug: string;
			role: MemberRole;
			alreadyMember: boolean;
	  }
	| { ok: false; reason: InviteUnusableReason | "not_found" };

/** 招待コードを確かめる（参加する前に、どの団体かを見せるため） */
export const previewInvite = async (
	userId: string,
	rawCode: string,
	now: Date = new Date(),
): Promise<InvitePreview> => {
	const code = normalizeInviteCode(rawCode);
	if (!isWellFormedInviteCode(code)) return { ok: false, reason: "not_found" };
	const invite = await prisma.invite.findUnique({
		where: { code },
		include: { organization: { select: { id: true, name: true, slug: true } } },
	});
	if (!invite) return { ok: false, reason: "not_found" };
	const reason = inviteUnusableReason(invite, now);
	if (reason) return { ok: false, reason };
	const existing = await prisma.member.count({
		where: { organizationId: invite.organizationId, userId },
	});
	return {
		ok: true,
		organizationName: invite.organization.name,
		organizationSlug: invite.organization.slug,
		role: invite.role,
		alreadyMember: existing > 0,
	};
};

export type AcceptInviteResult =
	| { ok: true; slug: string }
	| {
			ok: false;
			reason: InviteUnusableReason | "not_found" | "already_member";
	  };

/**
 * 招待コードで団体に参加する。使った回数は、上限を超えないことを条件に 1 つずつ増やす
 * （同時に使われても、上限を超えて参加させない）
 */
export const acceptInvite = async (input: {
	userId: string;
	code: string;
	displayName: string;
	now?: Date;
}): Promise<AcceptInviteResult> => {
	const now = input.now ?? new Date();
	const code = normalizeInviteCode(input.code);
	if (!isWellFormedInviteCode(code)) return { ok: false, reason: "not_found" };

	return prisma.$transaction(async (tx) => {
		const invite = await tx.invite.findUnique({
			where: { code },
			include: { organization: { select: { slug: true } } },
		});
		if (!invite) return { ok: false as const, reason: "not_found" as const };
		const reason = inviteUnusableReason(invite, now);
		if (reason) return { ok: false as const, reason };

		const already = await tx.member.count({
			where: { organizationId: invite.organizationId, userId: input.userId },
		});
		if (already > 0)
			return { ok: false as const, reason: "already_member" as const };

		// 上限に達していなければ 1 増やす（条件付きの更新なので、同時に使われても超えない）
		const claimed = await tx.invite.updateMany({
			where: {
				id: invite.id,
				revokedAt: null,
				expiresAt: { gt: now },
				...(invite.maxUses === null ? {} : { uses: { lt: invite.maxUses } }),
			},
			data: { uses: { increment: 1 } },
		});
		if (claimed.count === 0)
			return { ok: false as const, reason: "used_up" as const };

		await tx.member.create({
			data: {
				organizationId: invite.organizationId,
				userId: input.userId,
				role: invite.role,
				displayName: input.displayName,
			},
		});
		return { ok: true as const, slug: invite.organization.slug };
	});
};

export { INVITE_DEFAULT_EXPIRES_DAYS };
