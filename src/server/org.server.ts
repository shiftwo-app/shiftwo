// 団体の作成・ロール・招待コード・メンバーの操作（サーバー専用）。
// 「権限を持っているか」の確認は呼ぶ側（org.functions.ts の requireOrgAccess）で行い、
// ここでは権限の乗っ取りを防ぐ決まり（自分が持っている権限の範囲でしか、ロールに付けたり人に渡したりできない）を確かめる
import {
	generateInviteCode,
	INVITE_DEFAULT_EXPIRES_DAYS,
	type InviteUnusableReason,
	inviteUnusableReason,
	isWellFormedInviteCode,
	normalizeInviteCode,
} from "../lib/org/invite-code";
import {
	canGrant,
	canInviteWith,
	DEFAULT_ROLES,
	type Permission,
	parsePermissions,
} from "../lib/org/permissions";
import { isPrismaError, PRISMA_ERROR } from "../lib/prisma-errors";
import { checkGuildMembership, type GuildChecker } from "./discord.server";
import { prisma } from "../lib/prisma.server";

const DAY_MS = 24 * 60 * 60 * 1000;
/** 新しいテナントの時間粒度の既定（分） */
export const DEFAULT_TIME_UNIT_MINUTES = 15;
/** 団体を作ったときに 1 つ作るテナントの URL 名 */
export const DEFAULT_TENANT_SLUG = "main";

/** 操作をする人（requireOrgAccess で確かめた所属） */
export type Actor = {
	memberId: string;
	isOwner: boolean;
	permissions: Permission[];
};

export type Result<T = object> =
	| ({ ok: true } & T)
	| { ok: false; errors: string[] };
const fail = (...errors: string[]): { ok: false; errors: string[] } => ({
	ok: false,
	errors,
});

const FORBIDDEN_GRANT =
	"自分が持っていない権限を含むロールは、付けたり渡したりできません";

export type CreateOrganizationResult = Result<{ slug: string }>;

/** 団体を作り、作った人をオーナーにする。最初のロール（マネージャー・リーダー・スタッフ・ゲスト）とテナントも作る */
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
						isOwner: true,
						displayName: input.displayName,
					},
				},
				roles: {
					create: DEFAULT_ROLES.map((role, index) => ({
						name: role.name,
						color: role.color,
						permissions: [...role.permissions],
						sortOrder: index,
					})),
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
			return fail("この URL はすでに使われています");
		}
		throw error;
	}
};

/** 団体のロールを探す（ほかの団体のロールは見つからない） */
const findRole = (organizationId: string, roleId: string) =>
	prisma.orgRole.findFirst({
		where: { id: roleId, organizationId },
		select: { id: true, name: true, permissions: true, updatedAt: true },
	});

/** 確かめたあとに、ほかの人が同じロールを変えていたとき */
const CONCURRENT_CHANGE =
	"ほかの人が同時にこのロールを変えました。画面を読み直して、もう一度試してください";

// ---- ロール ----

export type RoleInput = {
	name: string;
	color: string;
	permissions: Permission[];
};

/** ロールを作る。自分が持っていない権限は付けられない */
export const createRole = async (
	organizationId: string,
	actor: Actor,
	input: RoleInput,
): Promise<Result<{ id: string }>> => {
	if (!canGrant(actor.permissions, input.permissions))
		return fail(FORBIDDEN_GRANT);
	const last = await prisma.orgRole.aggregate({
		where: { organizationId },
		_max: { sortOrder: true },
	});
	const role = await prisma.orgRole.create({
		data: {
			organizationId,
			name: input.name,
			color: input.color,
			permissions: input.permissions,
			sortOrder: (last._max.sortOrder ?? -1) + 1,
		},
		select: { id: true },
	});
	return { ok: true, id: role.id };
};

/** ロールを変える。自分より強いロール（自分にない権限を含む）は変えられず、自分にない権限も付けられない */
export const updateRole = async (
	organizationId: string,
	actor: Actor,
	roleId: string,
	input: RoleInput,
): Promise<Result> => {
	const role = await findRole(organizationId, roleId);
	if (!role) return fail("ロールが見つかりません");
	if (!canGrant(actor.permissions, parsePermissions(role.permissions))) {
		return fail("自分が持っていない権限を含むロールは変えられません");
	}
	if (!canGrant(actor.permissions, input.permissions))
		return fail(FORBIDDEN_GRANT);
	// 確かめたときのまま（updatedAt が同じ）のときだけ書く。途中でほかの人が権限を足していたら書かない
	const updated = await prisma.orgRole.updateMany({
		where: { id: role.id, organizationId, updatedAt: role.updatedAt },
		data: {
			name: input.name,
			color: input.color,
			permissions: input.permissions,
		},
	});
	if (updated.count === 0) return fail(CONCURRENT_CHANGE);
	return { ok: true };
};

/** ロールを消す（付いていたメンバー・割り当て・招待コードからも外れる）。自分より強いロールは消せない */
export const deleteRole = async (
	organizationId: string,
	actor: Actor,
	roleId: string,
): Promise<Result> => {
	const role = await findRole(organizationId, roleId);
	if (!role) return fail("ロールが見つかりません");
	if (!canGrant(actor.permissions, parsePermissions(role.permissions))) {
		return fail("自分が持っていない権限を含むロールは消せません");
	}
	// 確かめたときのまま（updatedAt が同じ）のときだけ消す
	const deleted = await prisma.orgRole.deleteMany({
		where: { id: role.id, organizationId, updatedAt: role.updatedAt },
	});
	if (deleted.count === 0) return fail(CONCURRENT_CHANGE);
	return { ok: true };
};

// ---- メンバーのロール ----

/**
 * メンバーのロールを付け直す。付ける・外すロールはどれも、自分が持っている権限の範囲のものだけ
 * （自分より強いロールを付けたり、外したりはできない）。オーナーは対象にできない
 */
export const setMemberRoles = async (
	organizationId: string,
	actor: Actor,
	memberId: string,
	roleIds: string[],
): Promise<Result> =>
	// 読む・確かめる・書くを 1 つのトランザクションで行い、書くのは確かめたロールだけにする
	// （確かめたあとに別の人が付けたロールを、確かめないまま外してしまわないように）
	prisma.$transaction(async (tx) => {
		const member = await tx.member.findFirst({
			where: { id: memberId, organizationId },
			select: { id: true, isOwner: true, roles: { select: { roleId: true } } },
		});
		if (!member) return fail("メンバーが見つかりません");
		if (member.isOwner) {
			return fail(
				"オーナーのロールは変えられません（オーナーは常に全権限です）",
			);
		}

		const wanted = [...new Set(roleIds)];
		const found = await tx.orgRole.count({
			where: { organizationId, id: { in: wanted } },
		});
		if (found !== wanted.length) return fail("ロールが見つかりません");

		const current = member.roles.map((r) => r.roleId);
		const toAdd = wanted.filter((id) => !current.includes(id));
		const toRemove = current.filter((id) => !wanted.includes(id));
		const changedRoles = await tx.orgRole.findMany({
			where: { organizationId, id: { in: [...toAdd, ...toRemove] } },
			select: { permissions: true },
		});
		if (
			changedRoles.some(
				(r) => !canGrant(actor.permissions, parsePermissions(r.permissions)),
			)
		) {
			return fail(FORBIDDEN_GRANT);
		}

		// 外すのは、上で確かめたロールだけ
		await tx.memberRoleAssignment.deleteMany({
			where: { memberId: member.id, roleId: { in: toRemove } },
		});
		for (const roleId of toAdd) {
			await tx.memberRoleAssignment.upsert({
				where: { memberId_roleId: { memberId: member.id, roleId } },
				update: {},
				create: { memberId: member.id, roleId },
			});
		}
		return { ok: true } as const;
	});

// ---- 招待コード ----

/**
 * 招待コードを発行する。付けるロールは、自分が持っている権限の範囲のものだけ
 * （「ゲストを招待する」がある人は、Discord の条件の免除を含むロールも）。コードが重なったら作り直す
 */
export const createInvite = async (input: {
	organizationId: string;
	actor: Actor;
	createdById: string;
	roleId: string;
	maxUses: number | null;
	expiresInDays: number;
	now?: Date;
}): Promise<Result<{ code: string }>> => {
	const role = await findRole(input.organizationId, input.roleId);
	if (!role) return fail("ロールが見つかりません");
	// 招待で渡せるのは、自分が持っている権限の範囲のロールだけ（「ゲストを招待する」がある人は、Discord の条件の免除も渡せる）
	if (
		!canInviteWith(input.actor.permissions, parsePermissions(role.permissions))
	) {
		return fail(FORBIDDEN_GRANT);
	}
	const now = input.now ?? new Date();
	for (let attempt = 0; attempt < 5; attempt++) {
		try {
			const invite = await prisma.invite.create({
				data: {
					organizationId: input.organizationId,
					createdById: input.createdById,
					code: generateInviteCode(),
					roleId: role.id,
					maxUses: input.maxUses,
					expiresAt: new Date(now.getTime() + input.expiresInDays * DAY_MS),
				},
				select: { code: true },
			});
			return { ok: true, code: invite.code };
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
			roleName: string;
			alreadyMember: boolean;
			/** 参加するのに Discord サーバーのメンバーである必要があるとき、そのサーバーの名前 */
			requiredDiscordGuildName: string | null;
	  }
	| { ok: false; reason: InviteUnusableReason | "not_found" };

/** 招待コードを確かめる（参加する前に、どの団体に、どのロールで参加するかを見せるため） */
export const previewInvite = async (
	userId: string,
	rawCode: string,
	now: Date = new Date(),
): Promise<InvitePreview> => {
	const code = normalizeInviteCode(rawCode);
	if (!isWellFormedInviteCode(code)) return { ok: false, reason: "not_found" };
	const invite = await prisma.invite.findUnique({
		where: { code },
		include: {
			organization: {
				select: {
					id: true,
					name: true,
					slug: true,
					discordGuildId: true,
					discordGuildName: true,
				},
			},
			role: { select: { name: true, permissions: true } },
		},
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
		roleName: invite.role.name,
		alreadyMember: existing > 0,
		requiredDiscordGuildName: requiresGuild(
			invite.organization.discordGuildId,
			invite.role.permissions,
		)
			? (invite.organization.discordGuildName ?? "指定のサーバー")
			: null,
	};
};

export type AcceptInviteResult =
	| { ok: true; slug: string }
	| {
			ok: false;
			reason:
				| InviteUnusableReason
				| "not_found"
				| "already_member"
				/** Discord を連携していない */
				| "discord_required"
				/** 団体の Discord サーバーのメンバーではない */
				| "not_in_guild"
				/** Discord に確かめられなかった */
				| "discord_unavailable";
	  };

/** 団体が Discord サーバーを指定していて、ロールに免除（guild.bypass）がなければ、確かめる必要がある */
const requiresGuild = (
	guildId: string | null,
	rolePermissions: unknown,
): guildId is string =>
	guildId !== null &&
	!parsePermissions(rolePermissions).includes("guild.bypass");

/**
 * 招待コードで団体に参加し、招待コードのロールを付ける。使った回数は、上限を超えないことを条件に
 * 1 つずつ増やす（同時に使われても、上限を超えて参加させない）
 */
export const acceptInvite = async (input: {
	userId: string;
	code: string;
	displayName: string;
	now?: Date;
	/** Discord サーバーのメンバーかを確かめる（テストで差し替える） */
	checker?: GuildChecker;
}): Promise<AcceptInviteResult> => {
	const now = input.now ?? new Date();
	const code = normalizeInviteCode(input.code);
	if (!isWellFormedInviteCode(code)) return { ok: false, reason: "not_found" };

	// 団体が Discord サーバーを指定していれば、参加の前にメンバーかを確かめる（Discord への問い合わせは
	// トランザクションの外で行う）。ゲストなど免除のロールの招待コードなら確かめない
	const target = await prisma.invite.findUnique({
		where: { code },
		select: {
			organization: { select: { discordGuildId: true } },
			role: { select: { permissions: true } },
		},
	});
	let avatarUrl: string | null = null;
	if (
		target &&
		requiresGuild(target.organization.discordGuildId, target.role.permissions)
	) {
		const check = await (input.checker ?? checkGuildMembership)(
			input.userId,
			target.organization.discordGuildId,
		);
		if (check.status === "no_discord")
			return { ok: false, reason: "discord_required" };
		if (check.status === "not_member")
			return { ok: false, reason: "not_in_guild" };
		if (check.status === "unknown") {
			return { ok: false, reason: "discord_unavailable" };
		}
		avatarUrl = check.avatarUrl;
	}

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
				displayName: input.displayName,
				avatarUrl,
				roles: { create: { roleId: invite.roleId } },
			},
		});
		return { ok: true as const, slug: invite.organization.slug };
	});
};

export { INVITE_DEFAULT_EXPIRES_DAYS };
