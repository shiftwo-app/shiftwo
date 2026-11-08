import { useNavigate, useRouter } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useId, useMemo, useState } from "react";
import type { FormEvent } from "react";
import { useIntlLocale, useT } from "../../lib/i18n/react";
import type { ShiftScopeParams } from "../../lib/shift-scope";
import { setBreakGapFn } from "../../server/manage.functions";
import type { getShiftBoard } from "../../server/shifts.functions";
import { ShiftStatus } from "../../types";
import { formatDayIn, formatTime, listShiftDays } from "../timeline/layout";
import Alert from "../ui/Alert";
import Badge from "../ui/Badge";
import Button from "../ui/Button";
import PageHeader from "../ui/PageHeader";
import Section from "../ui/Section";
import { buildDayReport, type FillLevel } from "./report";
import { formatDuration, positionCsv, staffCsv } from "./report-csv";

type Board = Awaited<ReturnType<typeof getShiftBoard>>;

const LEVEL_BAR: Record<FillLevel, string> = {
	ok: "bg-primary",
	warn: "bg-warn",
	danger: "bg-danger",
};
const LEVEL_TEXT: Record<FillLevel, string> = {
	ok: "text-ink",
	warn: "text-warn",
	danger: "text-danger",
};

const download = (name: string, text: string) => {
	const url = URL.createObjectURL(new Blob([text], { type: "text/csv" }));
	const link = document.createElement("a");
	link.href = url;
	link.download = name;
	link.click();
	URL.revokeObjectURL(url);
};

/**
 * シフトの確認とレポート（FR-7）。日ごとに、持ち場ごとの充足率（FR-7-C）と、スタッフごとの働く時間・
 * 休憩・希望と違う割り当て（FR-7-B・D）を出し、CSV で書き出す（FR-7-E。シフトを編集できる人は全員分、
 * スタッフは自分の分だけ）
 */
const ReportPage = ({
	title,
	board,
	scope,
	status,
	canSetBreakGap,
}: {
	title: string;
	board: Board;
	scope: ShiftScopeParams;
	status: ShiftStatus;
	/** 休憩とみなす空きを変えられるか（テナントの管理の権限） */
	canSetBreakGap: boolean;
}) => {
	const t = useT();
	const intlLocale = useIntlLocale();
	const navigate = useNavigate();
	const router = useRouter();
	const id = useId();
	const days = useMemo(() => listShiftDays(board.shifts), [board.shifts]);
	const [selectedDay, setSelectedDay] = useState<number | undefined>(days[0]);
	const day =
		selectedDay !== undefined && days.includes(selectedDay)
			? selectedDay
			: days[0];
	const [query, setQuery] = useState("");

	const report = useMemo(
		() =>
			day === undefined
				? null
				: buildDayReport({
						day,
						shifts: board.shifts,
						positions: board.positions,
						staffs: board.staffs,
						breakGapMinutes: board.breakGapMinutes,
						conflicts: board.preferenceConflicts,
					}),
		[day, board],
	);
	const positionName = new Map(board.positions.map((p) => [p.id, p.name]));
	const staffs = (report?.staffs ?? []).filter((staff) =>
		staff.name.toLowerCase().includes(query.trim().toLowerCase()),
	);
	const dayLabel = day === undefined ? "" : formatDayIn(day, intlLocale);
	const fileDay =
		day === undefined
			? ""
			: new Date(day + 9 * 3_600_000).toISOString().slice(0, 10);

	const exportStaff = (onlyStaffId?: string) => {
		if (!report) return;
		download(
			`shifts-${fileDay}${onlyStaffId ? "-mine" : "-staff"}.csv`,
			staffCsv({
				report,
				positions: board.positions,
				onlyStaffId,
				labels: {
					staff: t("report.colStaff"),
					work: t("report.colWork"),
					break: t("report.colBreak"),
					overridden: t("report.colOverridden"),
					shift: (number) => t("report.shiftN", { number }),
					noPosition: t("report.noPosition"),
				},
			}),
		);
	};
	const exportPositions = () => {
		if (!report) return;
		download(
			`shifts-${fileDay}-positions.csv`,
			positionCsv({
				report,
				shifts: board.shifts,
				positions: board.positions,
				staffs: board.staffs,
				timeUnitMinutes: board.timeUnitMinutes,
				labels: {
					position: t("board.formPosition"),
					separator: t("report.nameSeparator"),
				},
			}),
		);
	};

	return (
		<main className="mx-auto max-w-5xl px-4 py-6 sm:px-6">
			<PageHeader
				title={title}
				actions={
					report &&
					(board.canEdit ? (
						<>
							<Button size="sm" onClick={exportPositions}>
								{t("report.exportTitle")}（{t("report.exportPositions")}）
							</Button>
							<Button size="sm" onClick={() => exportStaff()}>
								{t("report.exportTitle")}（{t("report.exportStaff")}）
							</Button>
						</>
					) : (
						board.myStaffId &&
						report.staffs.some((staff) => staff.id === board.myStaffId) && (
							<Button size="sm" onClick={() => exportStaff(board.myStaffId!)}>
								{t("report.exportTitle")}（{t("report.exportMine")}）
							</Button>
						)
					))
				}
			/>

			<div className="mb-6 flex flex-wrap items-end gap-4">
				<label htmlFor={`${id}-status`} className="flex flex-col gap-1 text-sm">
					<span className="font-bold text-ink">{t("report.status")}</span>
					<select
						id={`${id}-status`}
						value={status}
						onChange={(event) =>
							void navigate({
								to: ".",
								search: {
									status:
										event.target.value === ShiftStatus.draft
											? ShiftStatus.draft
											: undefined,
								},
							})
						}
						className="control"
					>
						<option value={ShiftStatus.confirmed}>
							{t("report.statusConfirmed")}
						</option>
						<option value={ShiftStatus.draft}>{t("report.statusDraft")}</option>
					</select>
				</label>
				{days.length > 0 && (
					<label htmlFor={`${id}-day`} className="flex flex-col gap-1 text-sm">
						<span className="font-bold text-ink">{t("report.day")}</span>
						<select
							id={`${id}-day`}
							value={day}
							onChange={(event) => setSelectedDay(Number(event.target.value))}
							className="control tabular"
						>
							{days.map((value) => (
								<option key={value} value={value}>
									{formatDayIn(value, intlLocale)}
								</option>
							))}
						</select>
					</label>
				)}
				{canSetBreakGap && (
					<BreakGapForm
						scope={scope}
						current={board.breakGapMinutes}
						onSaved={() => router.invalidate()}
					/>
				)}
			</div>

			{!report || !report.window ? (
				<Alert tone="info">{t("report.noShifts")}</Alert>
			) : (
				<div>
					<Section
						id={`${id}-fill`}
						title={t("report.fillTitle")}
						description={t("report.fillDescription", {
							start: formatTime(report.window.start),
							end: formatTime(report.window.end),
						})}
					>
						{!board.positionsEnabled ? (
							<Alert tone="info">{t("report.fillPositionsOff")}</Alert>
						) : report.positions.length === 0 ? (
							<Alert tone="info">{t("report.fillNone")}</Alert>
						) : (
							<ul
								className="space-y-3"
								aria-label={`${dayLabel} ${t("report.fillTitle")}`}
							>
								{report.positions.map((position) => {
									const percent = Math.round(position.rate * 100);
									return (
										<li key={position.id} className="space-y-1">
											<div className="flex flex-wrap items-baseline justify-between gap-2 text-sm">
												<span className="flex items-center gap-2 font-bold text-ink">
													<span
														aria-hidden="true"
														className="inline-block size-3 rounded-sm"
														style={{ backgroundColor: position.color }}
													/>
													{position.name}
												</span>
												<span className="flex items-baseline gap-2">
													<span className="text-xs text-ink-muted tabular">
														{t("report.fillDetail", {
															filled: formatDuration(position.filledMs),
															needed: formatDuration(position.neededMs),
														})}
													</span>
													<span
														className={`text-base font-bold tabular ${LEVEL_TEXT[position.level]}`}
													>
														{t("report.fillRate", { rate: percent })}
													</span>
												</span>
											</div>
											<div
												role="progressbar"
												aria-valuemin={0}
												aria-valuemax={100}
												aria-valuenow={percent}
												aria-label={position.name}
												className="h-2 overflow-hidden rounded-full bg-surface-sunken"
											>
												<div
													className={`h-full rounded-full ${LEVEL_BAR[position.level]}`}
													style={{ width: `${Math.min(100, percent)}%` }}
												/>
											</div>
										</li>
									);
								})}
							</ul>
						)}
					</Section>

					<Section
						id={`${id}-staff`}
						title={t("report.staffTitle")}
						description={t("report.staffDescription", {
							minutes: board.breakGapMinutes,
						})}
					>
						<label
							htmlFor={`${id}-search`}
							className="flex flex-col gap-1 text-sm"
						>
							<span className="font-bold text-ink">
								{t("report.staffSearch")}
							</span>
							<input
								id={`${id}-search`}
								type="search"
								list={`${id}-staff-names`}
								value={query}
								placeholder={t("report.staffSearchPlaceholder")}
								onChange={(event) => setQuery(event.target.value)}
								className="control sm:max-w-xs"
							/>
							<datalist id={`${id}-staff-names`}>
								{report.staffs.map((staff) => (
									<option key={staff.id} value={staff.name} />
								))}
							</datalist>
						</label>
						{staffs.length === 0 ? (
							<p className="text-sm text-ink-muted">{t("report.staffNone")}</p>
						) : (
							<ul className="divide-y divide-line rounded-lg border border-line bg-surface">
								{staffs.map((staff) => (
									<li key={staff.id} className="space-y-2 p-3 text-sm">
										<div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
											<span className="font-bold text-ink">{staff.name}</span>
											<span className="text-ink-muted">
												{t("report.colWork")}{" "}
												<span className="font-bold text-ink tabular">
													{formatDuration(staff.workMs)}
												</span>
											</span>
											<span className="text-ink-muted">
												{t("report.colBreak")}{" "}
												<span className="font-bold text-ink tabular">
													{formatDuration(staff.breakMs)}
												</span>
											</span>
											{staff.overriddenCount > 0 && (
												<Badge tone="warn">
													{t("report.overriddenBadge")} {staff.overriddenCount}
												</Badge>
											)}
										</div>
										<ul className="flex flex-wrap gap-2">
											{staff.shifts.map((shift) => (
												<li
													key={shift.id}
													title={shift.reasons.join("\n") || undefined}
													className={`rounded-md border px-2 py-0.5 text-xs tabular ${
														shift.overridden
															? "border-warn bg-warn-soft"
															: shift.isBreak
																? "border-dashed border-line-strong bg-surface-sunken"
																: "border-line bg-surface"
													}`}
												>
													{formatTime(shift.start)}–{formatTime(shift.end)}{" "}
													{shift.isBreak
														? t("report.breakBadge")
														: shift.positionId
															? positionName.get(shift.positionId)
															: ""}
													{shift.reasons.length > 0 && (
														<span className="sr-only">
															（{shift.reasons.join("、")}）
														</span>
													)}
												</li>
											))}
										</ul>
									</li>
								))}
							</ul>
						)}
					</Section>
				</div>
			)}
		</main>
	);
};

/** 休憩とみなす空き（分）を変える */
const BreakGapForm = ({
	scope,
	current,
	onSaved,
}: {
	scope: ShiftScopeParams;
	current: number;
	onSaved: () => Promise<void>;
}) => {
	const t = useT();
	const id = useId();
	const setBreakGap = useServerFn(setBreakGapFn);
	const [minutes, setMinutes] = useState(current);
	const submit = async (event: FormEvent<HTMLFormElement>) => {
		event.preventDefault();
		await setBreakGap({
			data: { orgSlug: scope.orgSlug, tenantSlug: scope.tenantSlug, minutes },
		});
		await onSaved();
	};
	return (
		<form onSubmit={submit} className="flex items-end gap-2">
			<label htmlFor={`${id}-gap`} className="flex flex-col gap-1 text-sm">
				<span className="font-bold text-ink">{t("report.breakGapLabel")}</span>
				<input
					id={`${id}-gap`}
					type="number"
					min={1}
					max={240}
					value={minutes}
					onChange={(event) => setMinutes(Number(event.target.value))}
					className="control tabular w-24"
				/>
			</label>
			<Button type="submit" size="sm" disabled={minutes === current}>
				{t("report.breakGapSave")}
			</Button>
		</form>
	);
};

export default ReportPage;
