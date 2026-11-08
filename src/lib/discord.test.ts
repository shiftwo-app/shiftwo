import { describe, expect, it } from "vite-plus/test";
import {
	discordGuildIconUrl,
	discordGuildMemberAvatarUrl,
	discordUserAvatarUrl,
	initialsOf,
} from "./discord";

describe("Discord のアイコンの URL", () => {
	it("ユーザー・サーバーでのプロフィール・サーバーのアイコン。アニメーション（a_）は gif", () => {
		expect(discordUserAvatarUrl("1", "abc")).toBe(
			"https://cdn.discordapp.com/avatars/1/abc.png?size=128",
		);
		expect(discordUserAvatarUrl("1", "a_abc")).toContain(".gif");
		expect(discordGuildMemberAvatarUrl("9", "1", "def")).toBe(
			"https://cdn.discordapp.com/guilds/9/users/1/avatars/def.png?size=128",
		);
		expect(discordGuildIconUrl("9", "ic")).toBe(
			"https://cdn.discordapp.com/icons/9/ic.png?size=64",
		);
	});

	it("アイコンがなければ null", () => {
		expect(discordUserAvatarUrl("1", null)).toBeNull();
		expect(discordGuildMemberAvatarUrl("9", "1", undefined)).toBeNull();
	});

	it("頭文字", () => {
		expect(initialsOf("山田太郎")).toBe("山");
		expect(initialsOf(" alice")).toBe("A");
		expect(initialsOf("")).toBe("?");
	});
});
