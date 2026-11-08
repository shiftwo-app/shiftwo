import { describe, expect, it } from "vite-plus/test";
import { MINUTE_MS } from "./layout";
import { applyDrag, snapToUnit } from "./snap";

const min = (minutes: number) => minutes * MINUTE_MS;

describe("snapToUnit", () => {
	it("いちばん近い目盛りに丸める", () => {
		expect(snapToUnit(min(7), 15)).toBe(min(0));
		expect(snapToUnit(min(8), 15)).toBe(min(15));
		expect(snapToUnit(min(44), 30)).toBe(min(30));
	});
});

describe("applyDrag", () => {
	const original = { start: min(60), end: min(120) };

	it("move は長さを保ったまま、開始を目盛りに合わせる", () => {
		expect(applyDrag("move", original, min(17), 15)).toEqual({
			start: min(75),
			end: min(135),
		});
	});

	it("resize-end は終了だけを目盛りに合わせる", () => {
		// 120 + 22 = 142 分 → いちばん近い目盛りは 135 分
		expect(applyDrag("resize-end", original, min(22), 15)).toEqual({
			start: min(60),
			end: min(135),
		});
	});

	it("resize-end で縮めすぎても、1 目盛りの長さを残す", () => {
		expect(applyDrag("resize-end", original, min(-200), 15)).toEqual({
			start: min(60),
			end: min(75),
		});
	});
});
