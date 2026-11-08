import { describe, expect, it } from "vite-plus/test";
import { localeFromCookie, localeOfRequest, negotiateLocale } from "./locales";
import { catalogs } from "./messages";
import { translate } from "./translate";

describe("言語の決め方", () => {
	it("ブラウザの言語から、用意している言語を選ぶ（中国語は地域で簡体字・繁体字を分ける）", () => {
		expect(negotiateLocale("en-US,en;q=0.9,ja;q=0.8")).toBe("en");
		expect(negotiateLocale("fr-FR,ko;q=0.5")).toBe("ko");
		expect(negotiateLocale("zh-TW,zh;q=0.9")).toBe("zh-Hant");
		expect(negotiateLocale("zh-Hant-HK")).toBe("zh-Hant");
		expect(negotiateLocale("zh-CN")).toBe("zh-Hans");
		expect(negotiateLocale("zh")).toBe("zh-Hans");
		expect(negotiateLocale("ja;q=0.3,en;q=0.9")).toBe("en");
		expect(negotiateLocale("fr-FR")).toBe("ja");
		expect(negotiateLocale(null)).toBe("ja");
	});

	it("Cookie で選んだ言語を、ブラウザの言語より優先する", () => {
		expect(localeFromCookie("a=1; shiftwo-locale=ko")).toBe("ko");
		expect(localeFromCookie("shiftwo-locale=xx")).toBeNull();
		expect(
			localeOfRequest(
				new Headers({
					cookie: "shiftwo-locale=zh-Hant",
					"accept-language": "en",
				}),
			),
		).toBe("zh-Hant");
		expect(localeOfRequest(new Headers({ "accept-language": "en" }))).toBe(
			"en",
		);
	});
});

describe("メッセージ", () => {
	it("言語ごとに引ける", () => {
		expect(translate("ja", "common.save")).toBe("保存");
		expect(translate("en", "common.save")).toBe("Save");
		expect(translate("ko", "common.save")).toBe("저장");
	});

	it("どの言語も、日本語と同じキーをすべて持ち、差し込みの名前もそろっている", () => {
		const placeholders = (text: string) =>
			[...text.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort();
		const jaKeys = Object.keys(catalogs.ja).sort();
		for (const [locale, catalog] of Object.entries(catalogs)) {
			expect(Object.keys(catalog).sort(), locale).toEqual(jaKeys);
			for (const key of jaKeys) {
				const k = key as keyof typeof catalog;
				expect(placeholders(catalog[k] ?? ""), `${locale} ${key}`).toEqual(
					placeholders(catalogs.ja[k] ?? ""),
				);
			}
		}
	});
});
