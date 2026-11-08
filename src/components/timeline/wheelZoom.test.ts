// 出典：Love-Rox/kichijitsu の apps/web/src/layout/gridMetrics.test.ts（MIT License）を、横軸向けに直した
import { describe, expect, it } from "vite-plus/test";
import {
	pinchZoomDirection,
	accumulateWheelZoom,
	WHEEL_ZOOM_DELTA_PER_STEP,
	wheelDeltaToPx,
	zoomedScrollOffset,
} from "./wheelZoom";

describe("wheelDeltaToPx", () => {
	it("pixel モード（0）はそのまま", () => {
		expect(wheelDeltaToPx(100, 0)).toBe(100);
		expect(wheelDeltaToPx(-4.5, 0)).toBe(-4.5);
	});

	it("line モード（1）は 1 行 16px 換算", () => {
		expect(wheelDeltaToPx(3, 1)).toBe(48);
	});

	it("page モード（2）は 1 操作でしきい値を必ず超える", () => {
		expect(Math.abs(wheelDeltaToPx(1, 2))).toBeGreaterThanOrEqual(
			WHEEL_ZOOM_DELTA_PER_STEP,
		);
	});
});

describe("accumulateWheelZoom", () => {
	it("しきい値未満は溜めるだけでズームしない（トラックパッドの細かい delta）", () => {
		let accum = 0;
		for (const delta of [4, 6, 5, 7]) {
			const result = accumulateWheelZoom(accum, delta);
			expect(result.direction).toBe(0);
			accum = result.accumPx;
		}
		expect(accum).toBe(22);
	});

	it("しきい値に達したら 1 段だけ進め、余りは捨てる", () => {
		expect(accumulateWheelZoom(22, 6)).toEqual({ accumPx: 0, direction: 1 });
	});

	it("マウスホイール 1 ノッチ（deltaY = 100）でも 1 段だけ", () => {
		expect(accumulateWheelZoom(0, 100)).toEqual({ accumPx: 0, direction: 1 });
		expect(accumulateWheelZoom(0, -100)).toEqual({
			accumPx: 0,
			direction: -1,
		});
	});
});

describe("zoomedScrollOffset", () => {
	// 見出し 160px、1 分 = 2px で scrollLeft = 600、アンカーはビューポートの左から 400px。
	// アンカーの時刻 = (600 + 400 - 160) / 2 = 420 分
	it("アンカーに見えていた時刻が、ズーム後も同じ位置に来る", () => {
		const after = zoomedScrollOffset(600, 400, 160, 2, 4);
		expect(after).toBe(420 * 4 + 160 - 400);
		expect((after + 400 - 160) / 4).toBe(420);
	});

	it("縮小しても同じ時刻が保たれる", () => {
		// scrollLeft = 2000 ならアンカーの時刻は (2000 + 400 - 160) / 2 = 1120 分
		const after = zoomedScrollOffset(2000, 400, 160, 2, 0.5);
		expect(after).toBe(320);
		expect((after + 400 - 160) / 0.5).toBe(1120);
	});

	it("ズームが変わらなければ、スクロールも変わらない", () => {
		expect(zoomedScrollOffset(600, 400, 160, 2, 2)).toBe(600);
	});

	it("先頭付近で縮小しても負にならない", () => {
		expect(zoomedScrollOffset(0, 200, 160, 4, 1)).toBe(0);
	});
});

describe("pinchZoomDirection", () => {
	it("指を広げたら拡大、狭めたら縮小、少しなら何もしない", () => {
		expect(pinchZoomDirection(100, 130)).toBe(-1);
		expect(pinchZoomDirection(100, 75)).toBe(1);
		expect(pinchZoomDirection(100, 110)).toBe(0);
		expect(pinchZoomDirection(0, 50)).toBe(0);
	});
});
