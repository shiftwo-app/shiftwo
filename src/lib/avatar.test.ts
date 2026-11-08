import { describe, expect, it } from "vite-plus/test";
import { resolveAvatarUrl, safeAvatarUrl } from "./avatar";

describe("safeAvatarUrl", () => {
	it("Discord の CDN の URL は通す", () => {
		const url = "https://cdn.discordapp.com/avatars/u1/a.png?size=128";
		expect(safeAvatarUrl(url)).toBe(url);
	});

	it("ほかのサーバー・http・似た名前のホスト・URL でないものは通さない", () => {
		for (const url of [
			"https://tracker.example.com/a.png",
			"http://cdn.discordapp.com/a.png",
			"https://cdn.discordapp.com.example.com/a.png",
			"https://user@evil.example/cdn.discordapp.com/a.png",
			"javascript:alert(1)",
			"not a url",
			"",
		]) {
			expect(safeAvatarUrl(url)).toBeNull();
		}
	});
});

describe("resolveAvatarUrl", () => {
	it("メンバーのアイコンがなければ、アカウントの画像を使う", () => {
		expect(
			resolveAvatarUrl({
				avatarUrl: null,
				user: { image: "https://cdn.discordapp.com/avatars/u1/b.png" },
			}),
		).toBe("https://cdn.discordapp.com/avatars/u1/b.png");
	});

	it("本人が書き換えた外の画像は出さない（頭文字になる）", () => {
		expect(
			resolveAvatarUrl({
				avatarUrl: null,
				user: { image: "https://tracker.example.com/pixel.png" },
			}),
		).toBeNull();
	});
});
