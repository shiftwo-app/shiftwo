// スタッフの希望（FR-5）の決まり。画面とサーバーの両方で使う。
// 希望は団体全体を基本にして、テナント・イベントごとに上書きできる（see prisma/schema/models.prisma の StaffPreference）
import { z } from "zod";

/** 希望を出す単位。団体全体・テナント・イベント */
export type PreferenceScope =
	| { level: "org" }
	| { level: "tenant"; tenantSlug: string }
	| { level: "event"; tenantSlug: string; eventSlug: string };

export type PreferenceLevel = PreferenceScope["level"];

export const PREFERENCE_LEVEL_LABELS: Record<PreferenceLevel, string> = {
	org: "団体全体",
	tenant: "テナント",
	event: "イベント",
};

/** URL の search に入れる形（org・t:<テナント>・e:<テナント>/<イベント>）にする */
export const encodePreferenceScope = (scope: PreferenceScope): string => {
	switch (scope.level) {
		case "org":
			return "org";
		case "tenant":
			return `t:${scope.tenantSlug}`;
		case "event":
			return `e:${scope.tenantSlug}/${scope.eventSlug}`;
	}
};

const SLUG = /^[a-z0-9-]+$/;

/** encodePreferenceScope の逆。読めなければ団体全体 */
export const decodePreferenceScope = (value: unknown): PreferenceScope => {
	if (typeof value !== "string") return { level: "org" };
	if (value.startsWith("t:")) {
		const tenantSlug = value.slice(2);
		if (SLUG.test(tenantSlug)) return { level: "tenant", tenantSlug };
	}
	if (value.startsWith("e:")) {
		const [tenantSlug, eventSlug, ...rest] = value.slice(2).split("/");
		if (
			rest.length === 0 &&
			tenantSlug &&
			eventSlug &&
			SLUG.test(tenantSlug) &&
			SLUG.test(eventSlug)
		) {
			return { level: "event", tenantSlug, eventSlug };
		}
	}
	return { level: "org" };
};

export const preferenceScopeSchema = z
	.unknown()
	.transform((value) => decodePreferenceScope(value));

/** DB で一意にするための単位の名前 */
export const preferenceScopeKey = (ids: {
	tenantId: string | null;
	eventId: string | null;
}): string =>
	ids.eventId ? `e:${ids.eventId}` : ids.tenantId ? `t:${ids.tenantId}` : "org";

export const PREFERENCE_MEMO_MAX = 200;
/** 休憩・参加できない時間は、1 つの希望に 20 個まで */
export const PREFERENCE_BREAKS_MAX = 20;

const isoDateTime = z.iso.datetime({ offset: true });

export const preferenceInputSchema = z.object({
	breaks: z
		.array(z.object({ start: isoDateTime, end: isoDateTime }))
		.max(
			PREFERENCE_BREAKS_MAX,
			`休憩は ${PREFERENCE_BREAKS_MAX} 個までにしてください`,
		),
	positionIds: z.array(z.uuid()).max(50),
	memo: z
		.string()
		.max(
			PREFERENCE_MEMO_MAX,
			`メモは ${PREFERENCE_MEMO_MAX} 文字までにしてください`,
		),
});
export type PreferenceInput = z.infer<typeof preferenceInputSchema>;

export type TimeRangeMs = { start: number; end: number };

/**
 * 希望が決まりに合っているかを調べ、守れていないもののメッセージを返す（FR-5-H）。
 * - 休憩は終わりが始まりより後で、時間粒度の区切りにそろっていること
 * - 休憩どうしが重ならないこと
 * - イベントの期間があれば、その中にあること
 * - 同じ持ち場を 2 回選ばないこと
 */
export const validatePreference = (
	input: { breaks: TimeRangeMs[]; positionIds: string[] },
	rules: { timeUnitMinutes: number; period: TimeRangeMs | null },
): string[] => {
	const errors: string[] = [];
	const unitMs = rules.timeUnitMinutes * 60_000;
	for (const [index, range] of input.breaks.entries()) {
		const label = `休憩 ${index + 1}`;
		if (range.end <= range.start) {
			errors.push(`${label}：終わりは始まりより後にしてください`);
		}
		if (range.start % unitMs !== 0 || range.end % unitMs !== 0) {
			errors.push(
				`${label}：時刻は ${rules.timeUnitMinutes} 分の区切りにしてください`,
			);
		}
		if (
			rules.period &&
			(range.start < rules.period.start || range.end > rules.period.end)
		) {
			errors.push(`${label}：イベントの期間の中にしてください`);
		}
	}
	const sorted = [...input.breaks].sort((a, b) => a.start - b.start);
	for (let i = 1; i < sorted.length; i++) {
		if (sorted[i].start < sorted[i - 1].end) {
			errors.push("休憩どうしが重なっています");
			break;
		}
	}
	if (new Set(input.positionIds).size !== input.positionIds.length) {
		errors.push("同じ持ち場が 2 回選ばれています");
	}
	return errors;
};

/** 締切を過ぎているか（締切なしなら過ぎていない） */
export const isPastDeadline = (deadline: Date | null, now: Date): boolean =>
	deadline !== null && now.getTime() > deadline.getTime();

/** あるスタッフの、単位ごとの希望（なければ null） */
export type PreferenceLayers<T> = {
	org: T | null;
	tenant: T | null;
	event: T | null;
};

/**
 * その単位で使う希望を決める。休憩とメモは、いちばん近い単位にある希望を使う
 * （イベント → テナント → 団体）。持ち場は単位ごとのものなので、その単位の希望のものだけを使う
 */
export const effectivePreference = <
	T extends { breaks: TimeRangeMs[]; memo: string; positionIds: string[] },
>(
	level: PreferenceLevel,
	layers: PreferenceLayers<T>,
): {
	breaks: TimeRangeMs[];
	memo: string;
	positionIds: string[];
	/** 休憩とメモをどの単位の希望から取ったか（どれにもなければ null） */
	source: PreferenceLevel | null;
} => {
	const order: PreferenceLevel[] =
		level === "event"
			? ["event", "tenant", "org"]
			: level === "tenant"
				? ["tenant", "org"]
				: ["org"];
	const source = order.find((l) => layers[l] !== null) ?? null;
	const picked = source ? layers[source] : null;
	return {
		breaks: picked?.breaks ?? [],
		memo: picked?.memo ?? "",
		positionIds: level === "org" ? [] : (layers[level]?.positionIds ?? []),
		source,
	};
};

const conflictTimeFormatter = new Intl.DateTimeFormat("ja-JP", {
	timeZone: "Asia/Tokyo",
	hour: "2-digit",
	minute: "2-digit",
});

/**
 * シフトがスタッフの希望と違うところ（FR-4-E）。違わなければ空。
 * - 持ち場の希望があって、その中にない持ち場
 * - 休憩・参加できない時間と重なる
 */
export const preferenceConflicts = (
	shift: { positionId: string; start: number; end: number },
	preference: { breaks: TimeRangeMs[]; positionIds: string[] },
): string[] => {
	const reasons: string[] = [];
	if (
		preference.positionIds.length > 0 &&
		!preference.positionIds.includes(shift.positionId)
	) {
		reasons.push("希望の持ち場ではありません");
	}
	for (const range of preference.breaks) {
		if (range.start < shift.end && shift.start < range.end) {
			reasons.push(
				`休憩（${conflictTimeFormatter.format(range.start)}〜${conflictTimeFormatter.format(range.end)}）と重なっています`,
			);
		}
	}
	return reasons;
};
