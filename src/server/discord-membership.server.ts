// 団体の Discord サーバーの条件に合わせて、メンバーの状態（見られるか・アイコン）を更新する（サーバー専用）。
// ログインのたび（auth.server.ts のセッション作成のフック）と、本人が「もう一度確かめる」を押したときに呼ぶ
import { hasPermission, permissionsOf } from "../lib/org/permissions";
import { prisma } from "../lib/prisma.server";
import { checkGuildMembership, type GuildChecker } from "./discord.server";

/** その人の、Discord サーバーを指定している団体での所属を、条件に合わせて更新する */
export const refreshDiscordMemberships = async (
	userId: string,
	options: { organizationId?: string; checker?: GuildChecker; now?: Date } = {},
) => {
	const checker = options.checker ?? checkGuildMembership;
	const now = options.now ?? new Date();
	const members = await prisma.member.findMany({
		where: {
			userId,
			...(options.organizationId
				? { organizationId: options.organizationId }
				: {}),
			organization: { discordGuildId: { not: null } },
		},
		select: {
			id: true,
			isOwner: true,
			guildSuspendedAt: true,
			organization: { select: { discordGuildId: true } },
			roles: { select: { role: { select: { permissions: true } } } },
		},
	});

	for (const member of members) {
		const guildId = member.organization.discordGuildId;
		if (!guildId) continue;
		const result = await checker(userId, guildId);
		// 免除の権限（ゲスト・オーナー）があれば、条件に関係なく見られる。アイコンだけ更新する
		const exempt = hasPermission(
			permissionsOf(
				member.isOwner,
				member.roles.map((r) => r.role),
			),
			"guild.bypass",
		);
		if (result.status === "member") {
			await prisma.member.update({
				where: { id: member.id },
				data: { guildSuspendedAt: null, avatarUrl: result.avatarUrl },
			});
		} else if (result.status === "unknown") {
			// わからないときは前の状態のまま（Discord が一時的に不調でも、締め出さない）
		} else if (exempt) {
			if (member.guildSuspendedAt) {
				await prisma.member.update({
					where: { id: member.id },
					data: { guildSuspendedAt: null },
				});
			}
		} else if (!member.guildSuspendedAt) {
			// サーバーを抜けた・Discord を連携していない：見られなくする（メンバー情報は残す）
			await prisma.member.update({
				where: { id: member.id },
				data: { guildSuspendedAt: now },
			});
		}
	}
};
