import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { loginMethods } from "../lib/auth.server";
import { resolveAvatarUrl } from "../lib/avatar";
import { serverT } from "../lib/i18n/request-locale.server";
import { prisma } from "../lib/prisma.server";
import { requireUserMiddleware } from "./auth-middleware";
import { refreshDiscordMemberships } from "./discord-membership.server";
import {
	fetchCurrentUserGuilds,
	getDiscordAccessToken,
} from "./discord.server";
import { findSuspendedMembership, requireOrgAccess } from "./org-access.server";

// Discord 連携まわりの server function。どれもログインが必要

const slug = z.string().min(1);

/** アカウントの設定：メールアドレスと Discord の連携の状態 */
export const getAccountSummary = createServerFn({ method: "GET" })
	.middleware([requireUserMiddleware])
	.handler(async ({ context }) => {
		const [discordAccount, user] = await Promise.all([
			prisma.account.findFirst({
				where: { userId: context.user.id, providerId: "discord" },
				select: { id: true },
			}),
			prisma.user.findUnique({
				where: { id: context.user.id },
				select: { uploadedAvatarKey: true, image: true },
			}),
		]);
		return {
			email: context.user.email,
			name: context.user.name,
			/** アカウントのアイコン（アップロードしたもの、なければ Discord のアイコン） */
			avatarUrl: resolveAvatarUrl({ user }),
			hasUploadedAvatar: Boolean(user?.uploadedAvatarKey),
			discordConfigured: loginMethods.discord,
			discordAccountId: discordAccount?.id ?? null,
		};
	});

/** 自分の、Discord サーバーを指定している団体での状態をすべて確かめ直す（Discord を連携した直後など） */
export const refreshMyDiscordStatus = createServerFn({ method: "POST" })
	.middleware([requireUserMiddleware])
	.handler(async ({ context }) => {
		await refreshDiscordMemberships(context.user.id);
		return { ok: true as const };
	});

/** その団体での自分の状態を確かめ直す（サーバーに戻ったあとなど）。見られるようになれば true */
export const recheckMyGuildMembership = createServerFn({ method: "POST" })
	.middleware([requireUserMiddleware])
	.validator((data: { orgSlug: unknown }) => ({
		orgSlug: slug.parse(data.orgSlug),
	}))
	.handler(async ({ data, context }) => {
		const suspended = await findSuspendedMembership(
			context.user.id,
			data.orgSlug,
		);
		if (!suspended) return { ok: true as const, restored: true };
		await refreshDiscordMemberships(context.user.id, {
			organizationId: suspended.organization.id,
		});
		const still = await findSuspendedMembership(context.user.id, data.orgSlug);
		return { ok: true as const, restored: still === null };
	});

/** 団体の Discord サーバーの設定（団体の設定の権限）：今の設定と、自分が参加しているサーバーの一覧 */
export const getDiscordGuildSettings = createServerFn({ method: "GET" })
	.middleware([requireUserMiddleware])
	.validator((data: { orgSlug: unknown }) => ({
		orgSlug: slug.parse(data.orgSlug),
	}))
	.handler(async ({ data, context }) => {
		const access = await requireOrgAccess(
			context.user.id,
			data.orgSlug,
			"org.settings",
		);
		const org = await prisma.organization.findUniqueOrThrow({
			where: { id: access.organization.id },
			select: {
				discordGuildId: true,
				discordGuildName: true,
				discordGuildIcon: true,
			},
		});
		const token = loginMethods.discord
			? await getDiscordAccessToken(context.user.id)
			: null;
		const guilds = token ? await fetchCurrentUserGuilds(token) : null;
		return {
			discordConfigured: loginMethods.discord,
			linked: token !== null,
			current: org.discordGuildId
				? {
						id: org.discordGuildId,
						name: org.discordGuildName,
						iconUrl: org.discordGuildIcon,
					}
				: null,
			guilds,
		};
	});

/**
 * 団体の参加の条件にする Discord サーバーを決める（null で条件なし）。団体の設定の権限が要る。
 * 選べるのは、自分が参加しているサーバーだけ（サーバー側で一覧を取り直して確かめる）
 */
export const setDiscordGuild = createServerFn({ method: "POST" })
	.middleware([requireUserMiddleware])
	.validator((data: { orgSlug: unknown; guildId: unknown }) => ({
		orgSlug: slug.parse(data.orgSlug),
		guildId: z.string().regex(/^\d+$/).nullable().parse(data.guildId),
	}))
	.handler(async ({ data, context }) => {
		const access = await requireOrgAccess(
			context.user.id,
			data.orgSlug,
			"org.settings",
		);
		if (data.guildId === null) {
			await prisma.organization.update({
				where: { id: access.organization.id },
				data: {
					discordGuildId: null,
					discordGuildName: null,
					discordGuildIcon: null,
				},
			});
			// 条件をなくしたので、見られなくなっていた人も戻す
			await prisma.member.updateMany({
				where: {
					organizationId: access.organization.id,
					guildSuspendedAt: { not: null },
				},
				data: { guildSuspendedAt: null },
			});
			return { ok: true as const };
		}
		const token = await getDiscordAccessToken(context.user.id);
		if (!token) {
			return {
				ok: false as const,
				errors: [serverT("errors.discordLinkFirst")],
			};
		}
		const guilds = await fetchCurrentUserGuilds(token);
		const guild = guilds?.find((g) => g.id === data.guildId);
		if (!guild) {
			return {
				ok: false as const,
				errors: [serverT("errors.discordGuildNotFound")],
			};
		}
		await prisma.organization.update({
			where: { id: access.organization.id },
			data: {
				discordGuildId: guild.id,
				discordGuildName: guild.name,
				discordGuildIcon: guild.iconUrl,
			},
		});
		return { ok: true as const };
	});
