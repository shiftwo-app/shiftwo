import { describe, expect, it } from "vite-plus/test";
import { resolveAvatarUrl, safeAvatarUrl } from "./avatar";

const FILE = "1aa4fead-237e-419c-b102-15eb477468a2.webp";
const OTHER = "a0c45d77-cf0d-4a34-91ca-6c9ced8c94e9.png";
const DISCORD = "https://cdn.discordapp.com/avatars/u1/b.png";
const GUILD = "https://cdn.discordapp.com/guilds/g/users/u1/avatars/c.png";

describe("safeAvatarUrl", () => {
	it("Discord の CDN の URL と、アップロードしたアイコンの URL は通す", () => {
		const url = "https://cdn.discordapp.com/avatars/u1/a.png?size=128";
		expect(safeAvatarUrl(url)).toBe(url);
		expect(safeAvatarUrl(`/api/avatars/${FILE}`)).toBe(`/api/avatars/${FILE}`);
	});

	it("ほかのサーバー・http・似た名前のホスト・URL でないものは通さない", () => {
		for (const url of [
			"https://tracker.example.com/a.png",
			"http://cdn.discordapp.com/a.png",
			"https://cdn.discordapp.com.example.com/a.png",
			"https://user@evil.example/cdn.discordapp.com/a.png",
			"//evil.example/a.png",
			"/api/avatars/../../etc/passwd",
			"/api/avatars/not-a-uuid.png",
			`/api/avatars/${FILE.replace(".webp", ".svg")}`,
			"javascript:alert(1)",
			"not a url",
			"",
		]) {
			expect(safeAvatarUrl(url), url).toBeNull();
		}
	});
});

describe("resolveAvatarUrl（どのアイコンを出すか）", () => {
	const all = {
		uploadedAvatarKey: FILE,
		avatarUrl: GUILD,
		user: { uploadedAvatarKey: OTHER, image: DISCORD },
	};

	it("団体でだけ使うアイコンを、何よりも優先する", () => {
		expect(resolveAvatarUrl(all)).toBe(`/api/avatars/${FILE}`);
	});

	it("次はアカウントでアップロードしたアイコン（Discord より、本人が選んだものを優先）", () => {
		expect(resolveAvatarUrl({ ...all, uploadedAvatarKey: null })).toBe(
			`/api/avatars/${OTHER}`,
		);
	});

	it("アップロードがなければ、Discord サーバーでのアイコン、次に Discord のアイコン", () => {
		const none = {
			uploadedAvatarKey: null,
			user: { uploadedAvatarKey: null, image: DISCORD },
		};
		expect(resolveAvatarUrl({ ...none, avatarUrl: GUILD })).toBe(GUILD);
		expect(resolveAvatarUrl({ ...none, avatarUrl: null })).toBe(DISCORD);
	});

	it("本人が書き換えた外の画像は出さない（頭文字になる）", () => {
		expect(
			resolveAvatarUrl({
				avatarUrl: null,
				user: { image: "https://tracker.example.com/pixel.png" },
			}),
		).toBeNull();
	});

	it("保存されたキーの形がおかしければ使わない", () => {
		expect(resolveAvatarUrl({ uploadedAvatarKey: "../secret.png" })).toBeNull();
	});
});
