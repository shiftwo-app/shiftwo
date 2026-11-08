import { describe, expect, it } from "vite-plus/test";
import { parseCsv, stripFormulaGuard, toCsv } from "./csv";

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

	it("式の文字で始まる値は ' を付けて書き出し（表計算ソフトで式として動かない）、読み戻すと元に戻る", () => {
		const csv = toCsv([
			['=HYPERLINK("http://evil")', "+1", "-x", "@a", "普通"],
		]);
		const [cells] = parseCsv(csv);
		expect(cells.slice(0, 4).every((cell) => cell.startsWith("'"))).toBe(true);
		expect(cells[4]).toBe("普通");
		expect(cells.map(stripFormulaGuard)).toEqual([
			'=HYPERLINK("http://evil")',
			"+1",
			"-x",
			"@a",
			"普通",
		]);
		expect(stripFormulaGuard("'普通")).toBe("'普通");
	});
});
