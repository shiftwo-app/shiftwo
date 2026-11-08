import { describe, expect, it } from "vite-plus/test";
import { readOtp } from "./read-otp";

describe("readOtp", () => {
	it("文字列はそのまま（先頭の 0 も残る）", () => {
		expect(readOtp("012345")).toBe("012345");
	});

	it("URL の読み込みで数値になったコードは、文字列に戻す", () => {
		expect(readOtp(897935)).toBe("897935");
	});

	it("それ以外は空", () => {
		expect(readOtp(undefined)).toBe("");
		expect(readOtp(1.5)).toBe("");
		expect(readOtp({})).toBe("");
	});
});
