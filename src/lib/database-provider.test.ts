import { describe, expect, it } from "vite-plus/test";
import { parseDatabaseProvider } from "./database-provider";

describe("parseDatabaseProvider", () => {
	it("未設定なら postgresql", () => {
		expect(parseDatabaseProvider(undefined)).toBe("postgresql");
		expect(parseDatabaseProvider("")).toBe("postgresql");
	});

	it("postgresql と sqlite を受け付ける", () => {
		expect(parseDatabaseProvider("postgresql")).toBe("postgresql");
		expect(parseDatabaseProvider("sqlite")).toBe("sqlite");
	});

	it("知らない値はエラー", () => {
		expect(() => parseDatabaseProvider("mysql")).toThrow(/DATABASE_PROVIDER/);
	});
});
