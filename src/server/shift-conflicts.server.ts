// シフトが、そのスタッフの希望（休憩・持ち場）と違うところ（FR-4-E）。シフトの画面と MCP で使う
import { serverT } from "../lib/i18n/request-locale.server";
import { preferenceConflicts } from "../lib/preferences";
import type { Shift } from "../types";
import { loadEffectivePreferences } from "./preferences.server";

/** シフトごとの、希望と違うところ（違うものだけ） */
export const conflictsOf = async (
	ids: { organizationId: string; tenantId: string; eventId: string | null },
	shifts: Shift[],
): Promise<Record<string, string[]>> => {
	const preferences = await loadEffectivePreferences(ids, [
		...new Set(shifts.map((shift) => shift.staffId)),
	]);
	const conflicts: Record<string, string[]> = {};
	for (const shift of shifts) {
		const preference = preferences.get(shift.staffId);
		if (!preference) continue;
		const reasons = preferenceConflicts(
			{
				positionId: shift.positionId,
				start: new Date(shift.timeRange.start).getTime(),
				end: new Date(shift.timeRange.end).getTime(),
			},
			preference,
			serverT,
		);
		if (reasons.length > 0) conflicts[shift.id] = reasons;
	}
	return conflicts;
};
