import { describe, expect, it } from "vite-plus/test";
import { isSameOriginRequest } from "./same-origin.server";

const post = (origin?: string) =>
	new Request("http://localhost:3000/api/me/avatar", {
		method: "POST",
		headers: origin ? { origin } : {},
	});

describe("isSameOriginRequest", () => {
	it("同じオリジンからなら通す", () => {
		expect(isSameOriginRequest(post("http://localhost:3000"))).toBe(true);
	});

	it("よそのサイトから・Origin がないときは通さない", () => {
		expect(isSameOriginRequest(post("https://evil.example"))).toBe(false);
		expect(
			isSameOriginRequest(post("http://localhost:3000.evil.example")),
		).toBe(false);
		expect(isSameOriginRequest(post())).toBe(false);
	});
});
