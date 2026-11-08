import { readFileSync } from "node:fs";
import { DbNull } from "@prisma/client-runtime-utils";
import { describe, expect, it } from "vite-plus/test";
import {
	OPTIONAL_STRING_LIST_FIELDS,
	withDbNulls,
} from "./auth-database.server";

// Prisma の client での名前（モデル名の先頭を小文字に）
const clientName = (model: string) => model[0]!.toLowerCase() + model.slice(1);

describe("OPTIONAL_STRING_LIST_FIELDS", () => {
	it("models.prisma の StringList? と同じ項目を持つ", () => {
		const schema = readFileSync("prisma/schema/models.prisma", "utf8");
		const found: Record<string, string[]> = {};
		for (const block of schema.matchAll(/^model (\w+) \{([\s\S]*?)^\}/gm)) {
			const fields = [...block[2]!.matchAll(/^\s+(\w+)\s+StringList\?/gm)].map(
				(match) => match[1]!,
			);
			if (fields.length > 0) found[clientName(block[1]!)] = fields;
		}
		expect(
			Object.fromEntries(
				Object.entries(OPTIONAL_STRING_LIST_FIELDS).map(([model, fields]) => [
					model,
					[...fields].sort(),
				]),
			),
		).toEqual(
			Object.fromEntries(
				Object.entries(found).map(([model, fields]) => [model, fields.sort()]),
			),
		);
	});
});

describe("withDbNulls", () => {
	it("決めた項目の null だけを DbNull にする（配列やほかの項目はそのまま）", () => {
		const args = withDbNulls(
			{
				data: { allowedScopes: null, name: null, scopes: ["a"] },
				select: { id: true },
			},
			["allowedScopes", "scopes"],
		);
		expect(args?.data).toEqual({
			allowedScopes: DbNull,
			name: null,
			scopes: ["a"],
		});
		expect(args?.select).toEqual({ id: true });
	});

	it("upsert の create と update、createMany の配列も見る", () => {
		const args = withDbNulls(
			{
				create: { allowedScopes: null },
				update: { allowedScopes: null },
			},
			["allowedScopes"],
		);
		expect(args?.create).toEqual({ allowedScopes: DbNull });
		expect(args?.update).toEqual({ allowedScopes: DbNull });
		expect(
			withDbNulls({ data: [{ allowedScopes: null }] }, ["allowedScopes"])?.data,
		).toEqual([{ allowedScopes: DbNull }]);
	});
});
