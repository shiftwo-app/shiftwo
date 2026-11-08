import { describe, expect, it } from "vite-plus/test";
import {
	fromPositionsSetting,
	resolvePositionsEnabled,
	toPositionsSetting,
} from "./positions";

describe("持ち場を使うか", () => {
	it("イベント → テナント → 団体の順に、決まっているものを使う", () => {
		expect(resolvePositionsEnabled({ organization: true, tenant: null })).toBe(
			true,
		);
		expect(resolvePositionsEnabled({ organization: true, tenant: false })).toBe(
			false,
		);
		expect(
			resolvePositionsEnabled({
				organization: true,
				tenant: false,
				event: true,
			}),
		).toBe(true);
		expect(
			resolvePositionsEnabled({
				organization: false,
				tenant: null,
				event: null,
			}),
		).toBe(false);
	});

	it("画面の選択肢と DB の値を行き来できる", () => {
		for (const value of [null, true, false]) {
			expect(fromPositionsSetting(toPositionsSetting(value))).toBe(value);
		}
	});
});
