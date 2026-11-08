import { describe, expect, it } from "vite-plus/test";
import {
	inRequestScope,
	requestScoped,
	runInRequestScope,
} from "./request-scope.server";

const KEY = Symbol("test value");

describe("リクエストごとの入れ物", () => {
	it("同じリクエストの中では、await をまたいでも同じものを返す", async () => {
		let created = 0;
		const create = () => ({ id: ++created });
		await runInRequestScope(async () => {
			const first = requestScoped(KEY, create);
			await new Promise((resolve) => setTimeout(resolve, 1));
			expect(requestScoped(KEY, create)).toBe(first);
		});
		expect(created).toBe(1);
	});

	it("同時に動いているリクエストどうしでは、別々に作る", async () => {
		let created = 0;
		const create = () => ({ id: ++created });
		const [a, b] = await Promise.all([
			runInRequestScope(async () => {
				await new Promise((resolve) => setTimeout(resolve, 2));
				return requestScoped(KEY, create);
			}),
			runInRequestScope(async () => requestScoped(KEY, create)),
		]);
		expect(a).not.toBe(b);
		expect(created).toBe(2);
	});

	it("リクエストの外で使うとエラーになる", () => {
		expect(inRequestScope()).toBe(false);
		expect(() => requestScoped(KEY, () => 1)).toThrow(/リクエストの外/);
	});
});
