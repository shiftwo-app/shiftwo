import { useId, useState } from "react";
import type { FormEvent } from "react";
import {
	PREFERENCE_BREAKS_MAX,
	PREFERENCE_MEMO_MAX,
	type PreferenceInput,
	type TimeRangeMs,
	validatePreference,
} from "../../lib/preferences";
import Button from "../ui/Button";
import { joinJst, splitJst, timeOptions } from "./time";

type BreakRow = { key: number; date: string; start: number; end: number };

const legend = "mb-2 text-sm font-bold text-ink";

let nextKey = 0;
const toRow = (range: TimeRangeMs): BreakRow => {
	const start = splitJst(range.start);
	const end = splitJst(range.end);
	// 次の日の 0 時に終わるものは、その日の 24:00 として出す
	const endMinutes =
		end.date !== start.date && end.minutes === 0 ? 24 * 60 : end.minutes;
	return {
		key: nextKey++,
		date: start.date,
		start: start.minutes,
		end: endMinutes,
	};
};

/**
 * 希望のフォーム（FR-5）。休憩（日付と時刻のプルダウン。FR-5-C）・持ち場（チェックボックス。FR-5-D）・
 * メモ（200 文字まで。FR-5-E）。決まりに合わないものは、送る前にもその場で出す（FR-5-H。守りはサーバー側）
 */
const PreferenceForm = ({
	positions,
	timeUnitMinutes,
	period,
	initial,
	disabled,
	submitLabel,
	onSubmit,
}: {
	/** 選べる持ち場（団体全体の希望では空） */
	positions: { id: string; name: string; color: string }[];
	timeUnitMinutes: number;
	/** イベントの期間（ms）。決まっていなければ null */
	period: TimeRangeMs | null;
	initial: { breaks: TimeRangeMs[]; positionIds: string[]; memo: string };
	disabled: boolean;
	submitLabel: string;
	onSubmit: (input: PreferenceInput) => Promise<boolean>;
}) => {
	const id = useId();
	const [rows, setRows] = useState<BreakRow[]>(() => initial.breaks.map(toRow));
	const [positionIds, setPositionIds] = useState<string[]>(
		// もう選べない持ち場（消されたなど）は外す
		initial.positionIds.filter((pid) => positions.some((p) => p.id === pid)),
	);
	const [memo, setMemo] = useState(initial.memo);
	const startOptions = timeOptions(timeUnitMinutes, false);
	const endOptions = timeOptions(timeUnitMinutes, true);
	const defaultDate = splitJst(period?.start ?? Date.now()).date;

	const toRanges = (list: BreakRow[]): TimeRangeMs[] =>
		list.map((row) => ({
			start: joinJst(row.date, row.start),
			end: joinJst(row.date, row.end),
		}));
	const errors = validatePreference(
		{ breaks: toRanges(rows), positionIds },
		{ timeUnitMinutes, period },
	);

	const update = (key: number, patch: Partial<BreakRow>) =>
		setRows((list) =>
			list.map((row) => (row.key === key ? { ...row, ...patch } : row)),
		);
	const addRow = () =>
		setRows((list) => [
			...list,
			{ key: nextKey++, date: defaultDate, start: 12 * 60, end: 13 * 60 },
		]);

	const submit = async (event: FormEvent<HTMLFormElement>) => {
		event.preventDefault();
		if (errors.length > 0) return;
		await onSubmit({
			breaks: toRanges(rows).map((range) => ({
				start: new Date(range.start).toISOString(),
				end: new Date(range.end).toISOString(),
			})),
			positionIds,
			memo,
		});
	};

	return (
		<form onSubmit={submit} className="space-y-6 text-sm">
			<fieldset className="min-w-0 space-y-2" disabled={disabled}>
				<legend className={legend}>休憩・参加できない時間</legend>
				{rows.length === 0 && (
					<p className="text-ink-muted">ありません（いつでも入れます）。</p>
				)}
				{rows.map((row, index) => (
					// 狭い画面では日付を 1 段目、時刻と「消す」を 2 段目に置く
					<div
						key={row.key}
						className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)_auto] items-center gap-2 sm:flex sm:flex-wrap"
					>
						<label htmlFor={`${id}-${row.key}-date`} className="sr-only">
							休憩 {index + 1} の日付
						</label>
						<input
							id={`${id}-${row.key}-date`}
							type="date"
							required
							value={row.date}
							min={period ? splitJst(period.start).date : undefined}
							max={period ? splitJst(period.end - 1).date : undefined}
							onChange={(event) =>
								update(row.key, { date: event.target.value })
							}
							className="control tabular col-span-4 min-w-0 sm:w-44"
						/>
						<label htmlFor={`${id}-${row.key}-start`} className="sr-only">
							休憩 {index + 1} の始まり
						</label>
						<select
							id={`${id}-${row.key}-start`}
							value={row.start}
							onChange={(event) =>
								update(row.key, { start: Number(event.target.value) })
							}
							className="control tabular min-w-0"
						>
							{startOptions.map((option) => (
								<option key={option.value} value={option.value}>
									{option.label}
								</option>
							))}
						</select>
						<span aria-hidden="true" className="text-ink-muted">
							〜
						</span>
						<label htmlFor={`${id}-${row.key}-end`} className="sr-only">
							休憩 {index + 1} の終わり
						</label>
						<select
							id={`${id}-${row.key}-end`}
							value={row.end}
							onChange={(event) =>
								update(row.key, { end: Number(event.target.value) })
							}
							className="control tabular min-w-0"
						>
							{endOptions.map((option) => (
								<option key={option.value} value={option.value}>
									{option.label}
								</option>
							))}
						</select>
						<Button
							variant="ghost"
							size="sm"
							onClick={() =>
								setRows((list) => list.filter((r) => r.key !== row.key))
							}
						>
							消す
						</Button>
					</div>
				))}
				{rows.length < PREFERENCE_BREAKS_MAX && (
					<div className="pt-1">
						<Button variant="secondary" size="sm" onClick={addRow}>
							休憩を足す
						</Button>
					</div>
				)}
			</fieldset>

			{positions.length > 0 && (
				<fieldset className="min-w-0" disabled={disabled}>
					<legend className={legend}>やりたい持ち場（いくつでも）</legend>
					<div className="flex flex-wrap gap-2">
						{positions.map((position) => (
							// 札の形のチェックボックス。選ぶと札の色が変わる
							<label
								key={position.id}
								className="inline-flex cursor-pointer items-center gap-2 rounded-full border border-line bg-surface px-3 py-1 text-ink transition-colors hover:border-line-strong has-[:checked]:border-primary has-[:checked]:bg-primary-soft has-[:disabled]:cursor-not-allowed has-[:disabled]:opacity-60 has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-primary"
							>
								<input
									className="size-3.5 accent-primary"
									type="checkbox"
									checked={positionIds.includes(position.id)}
									onChange={(event) =>
										setPositionIds((list) =>
											event.target.checked
												? [...list, position.id]
												: list.filter((pid) => pid !== position.id),
										)
									}
								/>
								<span
									aria-hidden="true"
									className="inline-block size-2.5 rounded-full"
									style={{ backgroundColor: position.color }}
								/>
								{position.name}
							</label>
						))}
					</div>
				</fieldset>
			)}

			<div className="space-y-1">
				<label
					htmlFor={`${id}-memo`}
					className="block text-sm font-bold text-ink"
				>
					メモ（任意）
				</label>
				<textarea
					id={`${id}-memo`}
					value={memo}
					maxLength={PREFERENCE_MEMO_MAX}
					rows={3}
					disabled={disabled}
					onChange={(event) => setMemo(event.target.value)}
					aria-describedby={`${id}-memo-count`}
					className="control block w-full"
				/>
				<p
					id={`${id}-memo-count`}
					className="tabular text-right text-xs text-ink-muted"
				>
					{memo.length} / {PREFERENCE_MEMO_MAX} 文字
				</p>
			</div>

			{errors.length > 0 && (
				<ul
					role="alert"
					className="list-disc space-y-0.5 pl-5 text-sm font-bold text-danger"
				>
					{errors.map((message) => (
						<li key={message}>{message}</li>
					))}
				</ul>
			)}

			<Button
				type="submit"
				variant="primary"
				disabled={disabled || errors.length > 0}
			>
				{submitLabel}
			</Button>
		</form>
	);
};

export default PreferenceForm;
