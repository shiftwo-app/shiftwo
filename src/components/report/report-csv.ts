// レポートの CSV（FR-7-E、UTF-8）。持ち場別（列＝時間の枠、行＝持ち場）と、スタッフ別（行＝スタッフ、列＝シフトの一覧）
import { toCsv } from "../../lib/csv";
import { formatTime, toMs } from "../timeline/layout";
import type {
	DayReport,
	ReportPosition,
	ReportShift,
	ReportStaff,
} from "./report";

/** 長さ（ms）を「5:30」の形にする */
export const formatDuration = (ms: number): string => {
	const minutes = Math.round(ms / 60_000);
	return `${Math.floor(minutes / 60)}:${String(minutes % 60).padStart(2, "0")}`;
};

/**
 * 持ち場別：その日の時間帯を時間粒度の枠に分け、枠ごとに入っている人の名前を並べる
 * （枠の始まりから終わりまでのどこかに入っていれば、その枠に入っているとみなす）
 */
export const positionCsv = (input: {
	report: DayReport;
	shifts: ReportShift[];
	positions: ReportPosition[];
	staffs: ReportStaff[];
	timeUnitMinutes: number;
	labels: { position: string; separator: string };
}): string => {
	const { report } = input;
	if (!report.window) return toCsv([[input.labels.position]]);
	const unitMs = input.timeUnitMinutes * 60_000;
	const slots: number[] = [];
	for (
		let slot = Math.floor(report.window.start / unitMs) * unitMs;
		slot < report.window.end;
		slot += unitMs
	) {
		slots.push(slot);
	}
	const nameOf = new Map(input.staffs.map((staff) => [staff.id, staff.name]));
	const rows = input.positions.map((position) => [
		position.name,
		...slots.map((slot) =>
			[
				...new Set(
					input.shifts
						.filter(
							(shift) =>
								shift.positionId === position.id &&
								toMs(shift.timeRange.start) < slot + unitMs &&
								toMs(shift.timeRange.end) > slot,
						)
						.map((shift) => nameOf.get(shift.staffId) ?? ""),
				),
			].join(input.labels.separator),
		),
	]);
	return toCsv([[input.labels.position, ...slots.map(formatTime)], ...rows]);
};

/** スタッフ別：働く時間・休憩・希望と違う割り当ての数と、シフトの一覧（「09:00-12:00 受付」） */
export const staffCsv = (input: {
	report: DayReport;
	positions: ReportPosition[];
	labels: {
		staff: string;
		work: string;
		break: string;
		overridden: string;
		shift: (number: number) => string;
		noPosition: string;
	};
	/** 書き出すスタッフ（省けば全員。スタッフが自分の分だけを書き出すとき） */
	onlyStaffId?: string;
}): string => {
	const staffs = input.onlyStaffId
		? input.report.staffs.filter((staff) => staff.id === input.onlyStaffId)
		: input.report.staffs;
	const positionName = new Map(input.positions.map((p) => [p.id, p.name]));
	const maxShifts = Math.max(0, ...staffs.map((staff) => staff.shifts.length));
	const header = [
		input.labels.staff,
		input.labels.work,
		input.labels.break,
		input.labels.overridden,
		...Array.from({ length: maxShifts }, (_, i) => input.labels.shift(i + 1)),
	];
	const rows = staffs.map((staff) => [
		staff.name,
		formatDuration(staff.workMs),
		formatDuration(staff.breakMs),
		String(staff.overriddenCount),
		...staff.shifts.map((shift) =>
			`${formatTime(shift.start)}-${formatTime(shift.end)} ${
				shift.positionId
					? (positionName.get(shift.positionId) ?? "")
					: input.labels.noPosition
			}`.trim(),
		),
	]);
	return toCsv([header, ...rows]);
};
