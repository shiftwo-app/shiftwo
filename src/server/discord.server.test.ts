import { describe, expect, it, vi } from "vite-plus/test";

// discord.server.ts は auth・prisma を読み込むので、API の呼び出しだけを試すために差し替える
vi.mock("../lib/auth.server", () => ({ auth: {} }));
vi.mock("../lib/prisma.server", () => ({ prisma: {} }));

const { fetchCurrentUserGuilds, fetchGuildMember } =
	await import("./discord.server");

const respond = (status: number, body: unknown = {}) =>
	(async () =>
		new Response(JSON.stringify(body), { status })) as unknown as typeof fetch;

describe("fetchGuildMember", () => {
	it("200 ならメンバー。サーバーでのアイコンを優先し、なければ Discord のアイコン", async () => {
		expect(
			await fetchGuildMember(
				"t",
				"g1",
				respond(200, { avatar: "srv", user: { id: "u1", avatar: "usr" } }),
			),
		).toEqual({
			status: "member",
			avatarUrl:
				"https://cdn.discordapp.com/guilds/g1/users/u1/avatars/srv.png?size=128",
		});
		expect(
			await fetchGuildMember(
				"t",
				"g1",
				respond(200, { avatar: null, user: { id: "u1", avatar: "usr" } }),
			),
		).toEqual({
			status: "member",
			avatarUrl: "https://cdn.discordapp.com/avatars/u1/usr.png?size=128",
		});
	});

	it("404 はメンバーではない、401 は連携をやり直す、ほかはわからない", async () => {
		expect(await fetchGuildMember("t", "g1", respond(404))).toEqual({
			status: "not_member",
		});
		expect(await fetchGuildMember("t", "g1", respond(401))).toEqual({
			status: "unauthorized",
		});
		expect(await fetchGuildMember("t", "g1", respond(429))).toEqual({
			status: "unknown",
		});
		expect(await fetchGuildMember("t", "g1", respond(500))).toEqual({
			status: "unknown",
		});
		const broken = (async () => {
			throw new Error("network");
		}) as unknown as typeof fetch;
		expect(await fetchGuildMember("t", "g1", broken)).toEqual({
			status: "unknown",
		});
	});

	it("アクセストークンを Bearer で送る", async () => {
		let sent: Headers | undefined;
		const spy = (async (_url: string, init?: RequestInit) => {
			sent = new Headers(init?.headers);
			return new Response("{}", { status: 404 });
		}) as unknown as typeof fetch;
		await fetchGuildMember("secret-token", "g1", spy);
		expect(sent?.get("authorization")).toBe("Bearer secret-token");
	});
});

describe("fetchCurrentUserGuilds", () => {
	it("サーバーの一覧をアイコンの URL 付きで返す。失敗したら null", async () => {
		expect(
			await fetchCurrentUserGuilds(
				"t",
				respond(200, [
					{ id: "g1", name: "運営", icon: "ic" },
					{ id: "g2", name: "x", icon: null },
				]),
			),
		).toEqual([
			{
				id: "g1",
				name: "運営",
				iconUrl: "https://cdn.discordapp.com/icons/g1/ic.png?size=64",
			},
			{ id: "g2", name: "x", iconUrl: null },
		]);
		expect(await fetchCurrentUserGuilds("t", respond(401))).toBeNull();
	});
});
