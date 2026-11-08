import { describe, expect, it } from "vite-plus/test";
import { parseCsv, toCsv } from "./csv";

describe("CSV", () => {
	it('ダブルクォートの中の , と改行、"" を読み、BOM と空の行を捨てる', () => {
		expect(parseCsv('﻿a,b\r\n"x, y","1\n2"\n\n"say ""hi""",\n')).toEqual([
			["a", "b"],
			["x, y", "1\n2"],
			['say "hi"', ""],
		]);
	});

	it("書いたものを読むと、元に戻る", () => {
		const rows = [
			["スタッフ", "メモ"],
			["山田, 太郎", '改行\nと "引用"'],
		];
		expect(parseCsv(toCsv(rows))).toEqual(rows);
	});
});
