import { describe, expect, it, vi } from "vite-plus/test";
import { platform } from "./node.server";

describe("runInBackground（Node）", () => {
	it("待たずに戻り、失敗はその場で投げられたものも含めてログに出す", async () => {
		const error = vi.spyOn(console, "error").mockImplementation(() => {});
		platform.runInBackground("その場で失敗", () => {
			throw new Error("sync");
		});
		platform.runInBackground("あとで失敗", async () => {
			throw new Error("async");
		});
		await new Promise((resolve) => setTimeout(resolve, 0));
		expect(error).toHaveBeenCalledWith("その場で失敗", expect.any(Error));
		expect(error).toHaveBeenCalledWith("あとで失敗", expect.any(Error));
		error.mockRestore();
	});
});
