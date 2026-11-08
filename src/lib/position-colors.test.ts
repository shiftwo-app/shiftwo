import { describe, expect, it } from "vite-plus/test";
import { nextPositionColor, POSITION_COLOR_SWATCHES } from "./position-colors";

describe("nextPositionColor", () => {
	it("まだ使われていない最初の見本を選ぶ（大文字・小文字は区別しない）", () => {
		expect(nextPositionColor([])).toBe(POSITION_COLOR_SWATCHES[0].color);
		expect(
			nextPositionColor([POSITION_COLOR_SWATCHES[0].color.toLowerCase()]),
		).toBe(POSITION_COLOR_SWATCHES[1].color);
	});
	it("全部使われていれば、数に応じて順に回す", () => {
		const all = POSITION_COLOR_SWATCHES.map((swatch) => swatch.color);
		expect(nextPositionColor(all)).toBe(POSITION_COLOR_SWATCHES[0].color);
		expect(nextPositionColor([...all, "#000000"])).toBe(
			POSITION_COLOR_SWATCHES[1].color,
		);
	});
});
