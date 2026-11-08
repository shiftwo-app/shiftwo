// 団体の Discord サーバーの条件（参加のときと、ログインのたびの確かめ直し）を、実際の DB で確かめる。
// Discord への問い合わせは差し替える。DATABASE_URL がない環境では飛ばす
import { afterAll, beforeAll, describe, expect, it } from "vite-plus/test";
import { loadEnvFileIfExists } from "../lib/load-env";
import type { GuildCheck, GuildChecker } from "./discord.server";

loadEnvFileIfExists();
const hasDatabase = Boolean(process.env.DATABASE_URL);

describe.skipIf(!hasDatabase)("Discord サーバーの条件（DB）", async () => {
	const { prisma } = await import("../lib/prisma.server");
	const { findMembership, findSuspendedMembership, requireOrgAccess } =
		await import("./org-access.server");
	const org = await import("./org.server");
	const { refreshDiscordMemberships } =
		await import("./discord-membership.server");

	const suffix = crypto.randomUUID().slice(0, 8);
	const GUILD = "123456789012345678";
	const userIds: string[] = [];
	const createUser = async (label: string) => {
		const user = await prisma.user.create({
			data: {
				id: crypto.randomUUID(),
				email: `${label}-${suffix}@example.com`,
				name: label,
				emailVerified: true,
			},
		});
		userIds.push(user.id);
		return user;
	};
	let orgId = "";
	let orgSlug = "";
	let owner: { id: string };
	const roleIds = {} as Record<string, string>;

	/** 決まった結果を返す確かめ方。呼ばれた回数も数える */
	const fixed = (result: GuildCheck) => {
		const checker: GuildChecker & { calls: number } = Object.assign(
			async () => {
				checker.calls++;
				return result;
			},
			{ calls: 0 },
		);
		return checker;
	};
	const neverCalled: GuildChecker = async () => {
		throw new Error("免除のロールなのに Discord に問い合わせた");
	};

	const invite = async (roleName: string) => {
		const result = await org.createInvite({
			organizationId: orgId,
			actor: {
				memberId: "",
				isOwner: true,
				permissions: (await findMembership(owner.id, orgSlug))!.member
					.permissions,
			},
			createdById: owner.id,
			roleId: roleIds[roleName],
			maxUses: null,
			expiresInDays: 7,
		});
		if (!result.ok) throw new Error(result.errors.join());
		return result.code;
	};

	beforeAll(async () => {
		owner = await createUser("d-owner");
		const created = await org.createOrganization({
			userId: owner.id,
			name: "Discord の団体",
			slug: `d-${suffix}`,
			displayName: "owner",
		});
		if (!created.ok) throw new Error(created.errors.join());
		const record = await prisma.organization.update({
			where: { slug: created.slug },
			data: { discordGuildId: GUILD, discordGuildName: "運営サーバー" },
		});
		orgId = record.id;
		orgSlug = record.slug;
		for (const role of await prisma.orgRole.findMany({
			where: { organizationId: orgId },
		})) {
			roleIds[role.name] = role.id;
		}
	});

	afterAll(async () => {
		await prisma.organization.deleteMany({ where: { id: orgId } });
		await prisma.user.deleteMany({ where: { id: { in: userIds } } });
	});

	describe("参加するとき", () => {
		it("招待の確認で、スタッフの招待にはサーバー名が出て、ゲストの招待には出ない", async () => {
			const viewer = await createUser("d-viewer");
			expect(
				await org.previewInvite(viewer.id, await invite("スタッフ")),
			).toMatchObject({
				requiredDiscordGuildName: "運営サーバー",
			});
			expect(
				await org.previewInvite(viewer.id, await invite("ゲスト")),
			).toMatchObject({
				requiredDiscordGuildName: null,
			});
		});

		it("サーバーのメンバーなら参加でき、サーバーでのアイコンが保存される", async () => {
			const user = await createUser("d-member");
			const checker = fixed({
				status: "member",
				avatarUrl: "https://cdn.discordapp.com/x.png",
			});
			expect(
				await org.acceptInvite({
					userId: user.id,
					code: await invite("スタッフ"),
					displayName: "m",
					checker,
				}),
			).toMatchObject({ ok: true });
			expect(checker.calls).toBe(1);
			const member = await prisma.member.findFirstOrThrow({
				where: { organizationId: orgId, userId: user.id },
			});
			expect(member.avatarUrl).toBe("https://cdn.discordapp.com/x.png");
		});

		it("メンバーでない・連携していない・確かめられない、はそれぞれの理由で断る", async () => {
			const user = await createUser("d-outsider");
			const code = await invite("スタッフ");
			expect(
				await org.acceptInvite({
					userId: user.id,
					code,
					displayName: "x",
					checker: fixed({ status: "not_member" }),
				}),
			).toEqual({ ok: false, reason: "not_in_guild" });
			expect(
				await org.acceptInvite({
					userId: user.id,
					code,
					displayName: "x",
					checker: fixed({ status: "no_discord" }),
				}),
			).toEqual({ ok: false, reason: "discord_required" });
			expect(
				await org.acceptInvite({
					userId: user.id,
					code,
					displayName: "x",
					checker: fixed({ status: "unknown" }),
				}),
			).toEqual({ ok: false, reason: "discord_unavailable" });
			expect(
				await prisma.member.count({
					where: { organizationId: orgId, userId: user.id },
				}),
			).toBe(0);
		});

		it("ゲスト（免除のロール）の招待コードなら、Discord に問い合わせずに参加できる", async () => {
			const user = await createUser("d-guest");
			expect(
				await org.acceptInvite({
					userId: user.id,
					code: await invite("ゲスト"),
					displayName: "g",
					checker: neverCalled,
				}),
			).toMatchObject({ ok: true });
		});
	});

	describe("ログインのたびの確かめ直し", () => {
		it("抜けた人は見られなくなり（メンバー情報は残る）、戻ればまた見られる", async () => {
			const user = await createUser("d-leaver");
			await org.acceptInvite({
				userId: user.id,
				code: await invite("スタッフ"),
				displayName: "leaver",
				checker: fixed({ status: "member", avatarUrl: null }),
			});
			await refreshDiscordMemberships(user.id, {
				checker: fixed({ status: "not_member" }),
			});
			expect(await findMembership(user.id, orgSlug)).toBeNull();
			await expect(
				requireOrgAccess(user.id, orgSlug, "shift.view"),
			).rejects.toMatchObject({ status: 404 });
			expect(await findSuspendedMembership(user.id, orgSlug)).not.toBeNull();
			const kept = await prisma.member.findFirstOrThrow({
				where: { organizationId: orgId, userId: user.id },
			});
			expect(kept.displayName).toBe("leaver");

			// わからないときは、前の状態（見られない）のまま
			await refreshDiscordMemberships(user.id, {
				checker: fixed({ status: "unknown" }),
			});
			expect(await findMembership(user.id, orgSlug)).toBeNull();

			// 戻れば見られる。アイコンも更新される
			await refreshDiscordMemberships(user.id, {
				checker: fixed({
					status: "member",
					avatarUrl: "https://cdn.discordapp.com/back.png",
				}),
			});
			expect(await findMembership(user.id, orgSlug)).not.toBeNull();
			expect(
				(
					await prisma.member.findFirstOrThrow({
						where: { organizationId: orgId, userId: user.id },
					})
				).avatarUrl,
			).toBe("https://cdn.discordapp.com/back.png");
		});

		it("Discord の連携を外した人も見られなくなる", async () => {
			const user = await createUser("d-unlinked");
			await org.acceptInvite({
				userId: user.id,
				code: await invite("スタッフ"),
				displayName: "u",
				checker: fixed({ status: "member", avatarUrl: null }),
			});
			await refreshDiscordMemberships(user.id, {
				checker: fixed({ status: "no_discord" }),
			});
			expect(await findMembership(user.id, orgSlug)).toBeNull();
		});

		it("ゲストとオーナーは、サーバーにいなくても見られなくならない", async () => {
			const guest = await createUser("d-guest2");
			await org.acceptInvite({
				userId: guest.id,
				code: await invite("ゲスト"),
				displayName: "g2",
				checker: neverCalled,
			});
			await refreshDiscordMemberships(guest.id, {
				checker: fixed({ status: "not_member" }),
			});
			expect(await findMembership(guest.id, orgSlug)).not.toBeNull();
			await refreshDiscordMemberships(owner.id, {
				checker: fixed({ status: "no_discord" }),
			});
			expect(await findMembership(owner.id, orgSlug)).not.toBeNull();
		});
	});
});
