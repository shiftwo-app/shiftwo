import { describe, expect, it } from "vite-plus/test";
import { safeRedirectPath } from "./safe-redirect";

describe("safeRedirectPath", () => {
	it("同じサイトの中のパスはそのまま", () => {
		expect(safeRedirectPath("/draft")).toBe("/draft");
		expect(safeRedirectPath("/o/techconf?day=1")).toBe("/o/techconf?day=1");
	});

	it("他のサイトへ飛ぶものは fallback", () => {
		expect(safeRedirectPath("https://evil.example")).toBe("/");
		expect(safeRedirectPath("//evil.example")).toBe("/");
		expect(safeRedirectPath("/\\evil.example")).toBe("/");
		expect(safeRedirectPath("javascript:alert(1)")).toBe("/");
	});

	it("文字列でない・空・制御文字入りは fallback", () => {
		expect(safeRedirectPath(undefined)).toBe("/");
		expect(safeRedirectPath("")).toBe("/");
		expect(safeRedirectPath("/a\nb")).toBe("/");
	});
});
