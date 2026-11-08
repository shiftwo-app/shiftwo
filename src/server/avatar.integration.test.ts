// アイコンのアップロード（保存・差し替え・やめる）を、実際の DB で確かめる。
// 保存先はメモリの中のものに差し替える。DATABASE_URL がない環境では飛ばす
import { afterAll, beforeAll, describe, expect, it } from "vite-plus/test";
import { resolveAvatarUrl, memberAvatarSelect } from "../lib/avatar";
import { loadEnvFileIfExists } from "../lib/load-env";
import type { BlobStore, StoredBlob } from "../lib/storage/blob-store";
import { readBodyWithLimit } from "./avatar.server";

loadEnvFileIfExists();
const hasDatabase = Boolean(process.env.DATABASE_URL);

const PNG = new Uint8Array([
	0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 1, 2,
]);

const memoryStore = () => {
	const blobs = new Map<string, StoredBlob>();
	const store: BlobStore = {
		async put(key, body, contentType) {
			blobs.set(key, { body: new Uint8Array(body), contentType });
		},
		async get(key) {
			return blobs.get(key) ?? null;
		},
		async delete(key) {
			blobs.delete(key);
		},
	};
	return { store, blobs };
};

describe("readBodyWithLimit", () => {
	const request = (
		body: Uint8Array<ArrayBuffer>,
		headers: Record<string, string> = {},
	) => new Request("http://localhost/", { method: "POST", body, headers });

	it("上限までなら読み、超えたら null", async () => {
		expect(
			await readBodyWithLimit(request(new Uint8Array(10)), 10),
		).toHaveLength(10);
		expect(await readBodyWithLimit(request(new Uint8Array(11)), 10)).toBeNull();
	});

	it("Content-Length で上限を超えると言っていれば、読まずに null", async () => {
		expect(
			await readBodyWithLimit(
				request(new Uint8Array(1), { "content-length": "999" }),
				10,
			),
		).toBeNull();
	});
});

describe.skipIf(!hasDatabase)("アイコンのアップロード（DB）", async () => {
	const { prisma } = await import("../lib/prisma.server");
	const { saveUploadedAvatar, removeUploadedAvatar } =
		await import("./avatar.server");
	const org = await import("./org.server");
	const suffix = crypto.randomUUID().slice(0, 8);
	let userId = "";
	let memberId = "";
	let orgId = "";

	beforeAll(async () => {
		const user = await prisma.user.create({
			data: {
				id: crypto.randomUUID(),
				email: `avatar-${suffix}@example.com`,
				name: "avatar",
				emailVerified: true,
			},
		});
		userId = user.id;
		const created = await org.createOrganization({
			userId,
			name: "アイコンの団体",
			slug: `a-${suffix}`,
			displayName: "me",
		});
		if (!created.ok) throw new Error(created.errors.join());
		const member = await prisma.member.findFirstOrThrow({
			where: { userId, organization: { slug: created.slug } },
		});
		memberId = member.id;
		orgId = member.organizationId;
	});

	afterAll(async () => {
		await prisma.organization.deleteMany({ where: { id: orgId } });
		await prisma.user.deleteMany({ where: { id: userId } });
	});

	const avatarOfMember = async () =>
		resolveAvatarUrl(
			await prisma.member.findUnique({
				where: { id: memberId },
				select: memberAvatarSelect,
			}),
		);

	it("画像でないものは保存しない", async () => {
		const { store, blobs } = memoryStore();
		const result = await saveUploadedAvatar(
			{ kind: "user", userId },
			new TextEncoder().encode("<svg></svg>"),
			store,
		);
		expect(result).toMatchObject({ ok: false, status: 400 });
		expect(blobs.size).toBe(0);
	});

	it("アカウントのアイコンを保存し、差し替えると前のファイルを消す", async () => {
		const { store, blobs } = memoryStore();
		const first = await saveUploadedAvatar(
			{ kind: "user", userId },
			PNG,
			store,
		);
		if (!first.ok) throw new Error(first.message);
		expect(await avatarOfMember()).toBe(`/api/avatars/${first.file}`);

		const second = await saveUploadedAvatar(
			{ kind: "user", userId },
			PNG,
			store,
		);
		if (!second.ok) throw new Error(second.message);
		expect(second.file).not.toBe(first.file);
		expect([...blobs.keys()]).toEqual([`avatars/${second.file}`]);
	});

	it("団体でだけ使うアイコンはアカウントのアイコンより優先し、やめるとアカウントのアイコンに戻る", async () => {
		const { store } = memoryStore();
		const account = await saveUploadedAvatar(
			{ kind: "user", userId },
			PNG,
			store,
		);
		const orgOnly = await saveUploadedAvatar(
			{ kind: "member", memberId },
			PNG,
			store,
		);
		if (!account.ok || !orgOnly.ok) throw new Error("保存できなかった");
		expect(await avatarOfMember()).toBe(`/api/avatars/${orgOnly.file}`);

		await removeUploadedAvatar({ kind: "member", memberId }, store);
		expect(await avatarOfMember()).toBe(`/api/avatars/${account.file}`);
	});
});
