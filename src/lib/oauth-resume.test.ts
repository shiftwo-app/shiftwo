import { describe, expect, it } from "vite-plus/test";
import {
	isServerPath,
	OAUTH_AUTHORIZE_PATH,
	oauthResumePath,
} from "./oauth-resume";

describe("oauthResumePath", () => {
	it("認可の途中でなければ null", () => {
		expect(oauthResumePath({ redirect: "/" })).toBeNull();
		expect(oauthResumePath({ client_id: "abc" })).toBeNull();
		expect(oauthResumePath({ sig: "x" })).toBeNull();
	});

	it("署名のための値と prompt を外して、認可の URL に戻す", () => {
		const path = oauthResumePath({
			response_type: "code",
			client_id: "abc",
			redirect_uri: "http://127.0.0.1:9999/callback",
			scope: "openid shiftwo:read",
			state: 123,
			prompt: "login",
			exp: 1794136724,
			ba_iat: 1794136124961,
			ba_param: ["client_id", "scope"],
			sig: "signature",
			redirect: "/",
		});
		expect(path?.startsWith(`${OAUTH_AUTHORIZE_PATH}?`)).toBe(true);
		const params = new URLSearchParams(path!.split("?")[1]);
		expect(Object.fromEntries(params)).toEqual({
			response_type: "code",
			client_id: "abc",
			redirect_uri: "http://127.0.0.1:9999/callback",
			scope: "openid shiftwo:read",
			state: "123",
		});
	});

	it("くり返しの値（resource など）は、くり返しのまま残す", () => {
		const path = oauthResumePath({
			client_id: "abc",
			sig: "s",
			resource: ["https://a.example/mcp", "https://b.example/mcp"],
		});
		const params = new URLSearchParams(path!.split("?")[1]);
		expect(params.getAll("resource")).toEqual([
			"https://a.example/mcp",
			"https://b.example/mcp",
		]);
	});
});

describe("isServerPath", () => {
	it("/api/ で始まるものだけ", () => {
		expect(isServerPath("/api/auth/oauth2/authorize?x=1")).toBe(true);
		expect(isServerPath("/o/demo")).toBe(false);
	});
});
