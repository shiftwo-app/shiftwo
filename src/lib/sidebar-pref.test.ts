import { describe, expect, it } from "vite-plus/test";
import { sidebarPinnedFromCookie } from "./sidebar-pref";

describe("sidebarPinnedFromCookie", () => {
	it("shiftwo-sidebar=pinned があるときだけ固定", () => {
		expect(sidebarPinnedFromCookie("a=1; shiftwo-sidebar=pinned; b=2")).toBe(
			true,
		);
		expect(sidebarPinnedFromCookie("shiftwo-sidebar=")).toBe(false);
		expect(sidebarPinnedFromCookie("x-shiftwo-sidebar=pinned")).toBe(false);
		expect(sidebarPinnedFromCookie(null)).toBe(false);
	});
});
