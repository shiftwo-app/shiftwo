import { describe, expect, it } from "vite-plus/test";
import { isLoginRequestedHere, normalizeEmail } from "./login-request";

describe("isLoginRequestedHere", () => {
	it("このブラウザで送ったアドレスと同じなら true（大文字小文字・空白は無視）", () => {
		expect(
			isLoginRequestedHere(
				normalizeEmail(" Leader@Example.com "),
				"leader@example.com",
			),
		).toBe(true);
	});

	it("違うアドレス（他人が送ってきたリンク）なら false", () => {
		expect(
			isLoginRequestedHere("leader@example.com", "attacker@example.com"),
		).toBe(false);
	});

	it("Cookie がなければ false（このブラウザでは送っていない）", () => {
		expect(isLoginRequestedHere(undefined, "leader@example.com")).toBe(false);
		expect(isLoginRequestedHere("", "leader@example.com")).toBe(false);
	});
});
