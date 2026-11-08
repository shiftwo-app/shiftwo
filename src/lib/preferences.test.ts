import { describe, expect, it } from "vite-plus/test";
import {
	decodePreferenceScope,
	effectivePreference,
	encodePreferenceScope,
	preferenceConflicts,
	validatePreference,
} from "./preferences";

const ms = (time: string) => Date.parse(`2026-11-20T${time}:00+09:00`);
const range = (start: string, end: string) => ({
	start: ms(start),
	end: ms(end),
});

describe("希望の単位", () => {
	it("URL の形と行き来でき、読めないものは団体全体にする", () => {
		for (const scope of [
			{ level: "org" },
			{ level: "tenant", tenantSlug: "shibuya" },
			{ level: "event", tenantSlug: "shibuya", eventSlug: "conf-2026" },
		] as const) {
			expect(decodePreferenceScope(encodePreferenceScope(scope))).toEqual(
				scope,
			);
		}
		for (const value of [undefined, "", "t:", "e:a", "e:a/b/c", "t:Upper", 1]) {
			expect(decodePreferenceScope(value)).toEqual({ level: "org" });
		}
	});
});

describe("validatePreference", () => {
	const rules = { timeUnitMinutes: 15, period: range("09:00", "18:00") };

	it("問題がなければ空", () => {
		expect(
			validatePreference(
				{
					breaks: [range("12:00", "13:00"), range("15:00", "15:15")],
					positionIds: ["a", "b"],
				},
				rules,
			),
		).toEqual([]);
	});

	it("逆さま・区切りずれ・期間の外・重なり・同じ持ち場を、それぞれ知らせる", () => {
		const errors = validatePreference(
			{
				breaks: [
					range("13:00", "12:00"),
					range("12:10", "12:40"),
					range("17:30", "19:00"),
					range("12:30", "12:45"),
				],
				positionIds: ["a", "a"],
			},
			rules,
		);
		expect(errors.join("\n")).toMatch(/休憩 1：終わり/);
		expect(errors.join("\n")).toMatch(/休憩 2：時刻は 15 分/);
		expect(errors.join("\n")).toMatch(/休憩 3：イベントの期間/);
		expect(errors).toContain("休憩どうしが重なっています");
		expect(errors).toContain("同じ持ち場が 2 回選ばれています");
	});

	it("期間がなければ、期間の外は問わない", () => {
		expect(
			validatePreference(
				{ breaks: [range("05:00", "06:00")], positionIds: [] },
				{ timeUnitMinutes: 15, period: null },
			),
		).toEqual([]);
	});
});

describe("effectivePreference", () => {
	const pref = (memo: string, positionIds: string[] = []) => ({
		breaks: [range("12:00", "13:00")],
		memo,
		positionIds,
	});

	it("イベントでは、イベント → テナント → 団体全体の順に休憩とメモを取る", () => {
		expect(
			effectivePreference("event", {
				org: pref("団体"),
				tenant: pref("テナント"),
				event: null,
			}),
		).toMatchObject({ source: "tenant", memo: "テナント" });
		expect(
			effectivePreference("event", {
				org: pref("団体"),
				tenant: null,
				event: null,
			}),
		).toMatchObject({ source: "org", memo: "団体" });
		expect(
			effectivePreference("event", { org: null, tenant: null, event: null }),
		).toEqual({ breaks: [], memo: "", positionIds: [], source: null });
	});

	it("持ち場は、その単位の希望のものだけ（テナントの持ち場はイベントに持ち込まない）", () => {
		expect(
			effectivePreference("event", {
				org: null,
				tenant: pref("テナント", ["tenant-position"]),
				event: null,
			}).positionIds,
		).toEqual([]);
		expect(
			effectivePreference("tenant", {
				org: pref("団体"),
				tenant: pref("テナント", ["tenant-position"]),
				event: pref("イベント", ["event-position"]),
			}).positionIds,
		).toEqual(["tenant-position"]);
	});
});

describe("preferenceConflicts（希望と違う割り当て）", () => {
	const shift = (positionId: string, start: string, end: string) => ({
		positionId,
		...range(start, end),
	});

	it("希望の持ち場の外・休憩との重なりを、それぞれ理由にする", () => {
		expect(
			preferenceConflicts(shift("reg", "11:30", "12:30"), {
				breaks: [range("12:00", "13:00")],
				positionIds: ["reception"],
			}),
		).toEqual([
			"希望の持ち場ではありません",
			"休憩（12:00〜13:00）と重なっています",
		]);
	});

	it("持ち場の希望がなければ持ち場は問わず、休憩に接するだけなら重ならない", () => {
		expect(
			preferenceConflicts(shift("reg", "13:00", "14:00"), {
				breaks: [range("12:00", "13:00")],
				positionIds: [],
			}),
		).toEqual([]);
	});
});
