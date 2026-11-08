import { describe, expect, it } from "vite-plus/test";
import { resolveDiscordConfig } from "./auth-config";

describe("resolveDiscordConfig", () => {
	it("どちらもなければ Discord ログインは無効", () => {
		expect(resolveDiscordConfig({})).toBeUndefined();
		expect(
			resolveDiscordConfig({
				DISCORD_CLIENT_ID: " ",
				DISCORD_CLIENT_SECRET: "",
			}),
		).toBeUndefined();
	});

	it("両方あれば有効", () => {
		expect(
			resolveDiscordConfig({
				DISCORD_CLIENT_ID: "id",
				DISCORD_CLIENT_SECRET: "secret",
			}),
		).toEqual({ clientId: "id", clientSecret: "secret" });
	});

	it("片方だけならエラー（設定し忘れに気づけるように）", () => {
		expect(() => resolveDiscordConfig({ DISCORD_CLIENT_ID: "id" })).toThrow(
			/DISCORD_CLIENT_SECRET/,
		);
	});
});
