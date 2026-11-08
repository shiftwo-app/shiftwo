// CSV を読む・書く（RFC 4180 の範囲：ダブルクォートで囲んだ値の中の , と改行、"" による " の表し方）。
// Excel が先頭に付ける BOM は外す

/** CSV の文字列を、行ごとの値の配列にする。空の行は捨てる */
export const parseCsv = (text: string): string[][] => {
	const source = text.replace(/^﻿/, "");
	const rows: string[][] = [];
	let row: string[] = [];
	let value = "";
	let quoted = false;
	for (let i = 0; i < source.length; i++) {
		const char = source[i];
		if (quoted) {
			if (char === '"') {
				if (source[i + 1] === '"') {
					value += '"';
					i++;
				} else {
					quoted = false;
				}
			} else {
				value += char;
			}
			continue;
		}
		if (char === '"' && value === "") {
			quoted = true;
		} else if (char === ",") {
			row.push(value);
			value = "";
		} else if (char === "\n" || char === "\r") {
			if (char === "\r" && source[i + 1] === "\n") i++;
			row.push(value);
			rows.push(row);
			row = [];
			value = "";
		} else {
			value += char;
		}
	}
	if (value !== "" || row.length > 0) {
		row.push(value);
		rows.push(row);
	}
	return rows.filter((cells) => cells.some((cell) => cell.trim() !== ""));
};

/** 値を CSV の 1 つの値にする（, " 改行を含むときはダブルクォートで囲む） */
const escapeCell = (value: string) =>
	/[",\r\n]/.test(value) ? `"${value.replaceAll('"', '""')}"` : value;

/** 行の配列を CSV の文字列にする（Excel で文字化けしないよう、先頭に BOM を付ける） */
export const toCsv = (rows: string[][]): string =>
	`﻿${rows.map((cells) => cells.map(escapeCell).join(",")).join("\r\n")}\r\n`;
