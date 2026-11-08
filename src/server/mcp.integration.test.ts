// MCP の道具が、シフトヲの中で決まっている権限の範囲でだけ動くことを、実際の DB で確かめる。
// DATABASE_URL がない環境では飛ばす
import { createMcpHandler } from "@modelcontextprotocol/server";
import { afterAll, beforeAll, describe, expect, it } from "vite-plus/test";
import { loadEnvFileIfExists } from "../lib/load-env";
import { MCP_SCOPE_READ, MCP_SCOPE_WRITE } from "../lib/mcp-config";

loadEnvFileIfExists();
const hasDatabase = Boolean(process.env.DATABASE_URL);

type ToolResponse = {
	isError?: boolean;
	content: { type: string; text: string }[];
	structuredContent?: Record<string, unknown>;
};

describe.skipIf(!hasDatabase)("MCP の道具の権限（DB）", async () => {
	const { prisma } = await import("../lib/prisma.server");
	const org = await import("./org.server");
	const { createShiftwoMcpServer } = await import("./mcp-tools.server");
	const { withMcpAuth } = await import("./mcp-auth.server");
	const { auth } = await import("../lib/auth.server");
	const { mcpResourceUrl } = await import("../lib/mcp-config");

	const suffix = crypto.randomUUID().slice(0, 8);
	const userIds: string[] = [];
	const orgIds: string[] = [];
	let owner = "";
	let staffUser = "";
	let outsider = "";
	let orgSlug = "";
	let otherOrgSlug = "";
	let tenantSlug = "";
	let staffId = "";
	let positionId = "";

	const createUser = async (name: string) => {
		const user = await prisma.user.create({
			data: {
				id: crypto.randomUUID(),
				email: `${name}-${suffix}@example.com`,
				name,
				emailVerified: true,
			},
		});
		userIds.push(user.id);
		return user.id;
	};

	const createOrg = async (userId: string, slug: string) => {
		const created = await org.createOrganization({
			userId,
			name: slug,
			slug,
			displayName: "owner",
		});
		if (!created.ok) throw new Error(created.errors.join());
		const organization = await prisma.organization.findUniqueOrThrow({
			where: { slug: created.slug },
		});
		orgIds.push(organization.id);
		return organization;
	};

	/** その人として、そのスコープで道具を呼ぶ（トークンの確かめは飛ばし、道具の中の確かめだけを見る） */
	const callTool = async (
		userId: string,
		scopes: string[],
		name: string,
		args: Record<string, unknown> = {},
	): Promise<ToolResponse> => {
		const handler = createMcpHandler(() =>
			createShiftwoMcpServer({
				userId,
				clientId: "test-client",
				scopes: new Set(scopes),
				token: "test",
			}),
		);
		const response = await handler.fetch(
			new Request("http://localhost/api/mcp", {
				method: "POST",
				headers: {
					"content-type": "application/json",
					accept: "application/json, text/event-stream",
					"mcp-protocol-version": "2025-06-18",
				},
				body: JSON.stringify({
					jsonrpc: "2.0",
					id: 1,
					method: "tools/call",
					params: { name, arguments: args },
				}),
			}),
		);
		const text = await response.text();
		const json = text.includes("data:")
			? text
					.split("\n")
					.filter((line) => line.startsWith("data:"))
					.map((line) => line.slice(5))
					.at(-1)!
			: text;
		const parsed = JSON.parse(json) as {
			result?: ToolResponse;
			error?: unknown;
		};
		if (!parsed.result) throw new Error(`tool call failed: ${json}`);
		return parsed.result;
	};

	const readWrite = [MCP_SCOPE_READ, MCP_SCOPE_WRITE];
	const readOnly = [MCP_SCOPE_READ];

	const shiftArgs = () => ({
		orgSlug,
		tenantSlug,
		staffId,
		positionId,
		start: "2026-11-20T10:00:00+09:00",
		end: "2026-11-20T11:00:00+09:00",
	});

	beforeAll(async () => {
		owner = await createUser("mcp-owner");
		staffUser = await createUser("mcp-staff");
		outsider = await createUser("mcp-outsider");
		const organization = await createOrg(owner, `mcp-${suffix}`);
		orgSlug = organization.slug;
		otherOrgSlug = (await createOrg(outsider, `mcp-other-${suffix}`)).slug;
		const tenant = await prisma.tenant.findFirstOrThrow({
			where: { organizationId: organization.id },
		});
		tenantSlug = tenant.slug;
		// 「スタッフ」のロール（シフトを見るだけ）のメンバー
		const staffRole = await prisma.orgRole.findFirstOrThrow({
			where: { organizationId: organization.id, name: "スタッフ" },
		});
		await prisma.member.create({
			data: {
				organizationId: organization.id,
				userId: staffUser,
				displayName: "staff",
				roles: { create: { roleId: staffRole.id } },
			},
		});
		staffId = (
			await prisma.staff.create({
				data: {
					organizationId: organization.id,
					name: "山田",
					unavailableTimes: [],
				},
			})
		).id;
		positionId = (
			await prisma.position.create({
				data: {
					organizationId: organization.id,
					tenantId: tenant.id,
					name: "受付",
					color: "#0E7C7B",
					requiredStaffCount: 1,
				},
			})
		).id;
	});

	afterAll(async () => {
		await prisma.organization.deleteMany({ where: { id: { in: orgIds } } });
		await prisma.user.deleteMany({ where: { id: { in: userIds } } });
	});

	it("所属している団体だけが見える", async () => {
		const mine = await callTool(owner, readOnly, "list_organizations");
		const slugs = (
			mine.structuredContent!.organizations as { slug: string }[]
		).map((o) => o.slug);
		expect(slugs).toEqual([orgSlug]);

		const other = await callTool(owner, readOnly, "list_scopes", {
			orgSlug: otherOrgSlug,
		});
		expect(other.isError).toBe(true);
		const board = await callTool(outsider, readOnly, "get_shift_board", {
			orgSlug,
			tenantSlug,
		});
		expect(board.isError).toBe(true);
	});

	it("書く権限のあるつなぎ方で、シフトを編集できる人だけが作れる", async () => {
		const created = await callTool(
			owner,
			readWrite,
			"create_shift",
			shiftArgs(),
		);
		expect(created.isError).toBeFalsy();
		const shift = created.structuredContent?.shift as {
			id: string;
			version: number;
			start: string;
		};
		expect(shift.start).toBe("2026-11-20T10:00:00+09:00");

		// 古い version では変えられない
		const stale = await callTool(owner, readWrite, "update_shift", {
			orgSlug,
			tenantSlug,
			shiftId: shift.id,
			version: shift.version + 1,
			end: "2026-11-20T12:00:00+09:00",
		});
		expect(stale.isError).toBe(true);

		const updated = await callTool(owner, readWrite, "update_shift", {
			orgSlug,
			tenantSlug,
			shiftId: shift.id,
			version: shift.version,
			end: "2026-11-20T12:00:00+09:00",
		});
		expect(updated.isError).toBeFalsy();
		expect((updated.structuredContent!.shift as { end: string }).end).toBe(
			"2026-11-20T12:00:00+09:00",
		);
	});

	it("見るだけのつなぎ方では、権限があっても書けない", async () => {
		const result = await callTool(owner, readOnly, "create_shift", shiftArgs());
		expect(result.isError).toBe(true);
		expect(result.content[0]?.text).toContain("read-only");
	});

	it("シフトを見るだけの人は、書く権限のあるつなぎ方でも作れず、希望と違うところも見えない", async () => {
		const board = await callTool(staffUser, readWrite, "get_shift_board", {
			orgSlug,
			tenantSlug,
		});
		expect(board.isError).toBeFalsy();
		expect(board.structuredContent?.canEdit).toBe(false);
		expect(board.structuredContent).not.toHaveProperty("preferenceConflicts");

		const created = await callTool(
			staffUser,
			readWrite,
			"create_shift",
			shiftArgs(),
		);
		expect(created.isError).toBe(true);
		expect(await prisma.shift.count({ where: { staffId } })).toBe(1);
	});

	it("トークンがなければ 401 と、認可の始め方を返す", async () => {
		const guarded = withMcpAuth(async () => new Response("ok"));
		const response = await guarded(
			new Request("http://localhost:3000/api/mcp", { method: "POST" }),
		);
		expect(response.status).toBe(401);
		expect(response.headers.get("www-authenticate")).toContain(
			"resource_metadata=",
		);
		const forged = await guarded(
			new Request("http://localhost:3000/api/mcp", {
				method: "POST",
				headers: { authorization: "Bearer not-a-jwt" },
			}),
		);
		expect(forged.status).toBe(401);
	});
	it("今の同意で狭めたスコープは、前に出したトークンでも使えない", async () => {
		const clientId = `mcp-test-${suffix}`;
		await prisma.oauthClient.create({
			data: {
				id: crypto.randomUUID(),
				clientId,
				name: "test",
				redirectUris: ["http://127.0.0.1:9999/callback"],
			},
		});
		// 書ける範囲で出したトークン
		const { token } = await auth.api.signJWT({
			body: {
				payload: {
					// OAuth で出すトークンと同じ発行者（Better Auth の baseURL）
					iss: (await auth.$context).baseURL,
					sub: owner,
					azp: clientId,
					aud: mcpResourceUrl(process.env.BETTER_AUTH_URL),
					scope: `${MCP_SCOPE_READ} ${MCP_SCOPE_WRITE}`,
				},
			},
		});
		let seen: Set<string> | null = null;
		const guarded = withMcpAuth(async (_request, principal) => {
			seen = principal.scopes;
			return new Response("ok");
		});
		const call = () =>
			guarded(
				new Request("http://localhost:3000/api/mcp", {
					method: "POST",
					headers: { authorization: `Bearer ${token}` },
				}),
			);

		// 同意がなければ（つながりを切ったあと）受け付けない
		expect((await call()).status).toBe(401);

		// つなぎ直して「見るだけ」に同意した
		await prisma.oauthConsent.create({
			data: {
				id: crypto.randomUUID(),
				clientId,
				userId: owner,
				scopes: [MCP_SCOPE_READ],
			},
		});
		const accepted = await call();
		expect(accepted.status, await accepted.clone().text()).toBe(200);
		expect(seen && [...seen!]).toEqual([MCP_SCOPE_READ]);
		await prisma.oauthClient.delete({ where: { clientId } });
	});
});
