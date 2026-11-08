import { useId, useState } from "react";
import type { FormEvent } from "react";
import {
	PREFERENCE_BREAKS_MAX,
	PREFERENCE_MEMO_MAX,
	type PreferenceInput,
	type TimeRangeMs,
	validatePreference,
} from "../../lib/preferences";
import { joinJst, splitJst, timeOptions } from "./time";

type BreakRow = { key: number; date: string; start: number; end: number };

const control = "rounded border px-2 py-1";
const primary =
	"rounded bg-blue-600 px-3 py-1 text-sm font-semibold text-white disabled:opacity-50";

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
		<form onSubmit={submit} className="space-y-4 text-sm">
			<fieldset className="space-y-2" disabled={disabled}>
				<legend className="font-semibold">休憩・参加できない時間</legend>
				{rows.length === 0 && (
					<p className="text-gray-600">ありません（いつでも入れます）。</p>
				)}
				{rows.map((row, index) => (
					<div key={row.key} className="flex flex-wrap items-center gap-2">
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
							className={control}
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
							className={control}
						>
							{startOptions.map((option) => (
								<option key={option.value} value={option.value}>
									{option.label}
								</option>
							))}
						</select>
						<span aria-hidden="true">〜</span>
						<label htmlFor={`${id}-${row.key}-end`} className="sr-only">
							休憩 {index + 1} の終わり
						</label>
						<select
							id={`${id}-${row.key}-end`}
							value={row.end}
							onChange={(event) =>
								update(row.key, { end: Number(event.target.value) })
							}
							className={control}
						>
							{endOptions.map((option) => (
								<option key={option.value} value={option.value}>
									{option.label}
								</option>
							))}
						</select>
						<button
							type="button"
							onClick={() =>
								setRows((list) => list.filter((r) => r.key !== row.key))
							}
							className="underline"
						>
							消す
						</button>
					</div>
				))}
				{rows.length < PREFERENCE_BREAKS_MAX && (
					<button
						type="button"
						onClick={addRow}
						className="rounded border px-3 py-1"
					>
						休憩を足す
					</button>
				)}
			</fieldset>

			{positions.length > 0 && (
				<fieldset className="space-y-2" disabled={disabled}>
					<legend className="font-semibold">
						やりたい持ち場（いくつでも）
					</legend>
					<div className="flex flex-wrap gap-3">
						{positions.map((position) => (
							<label key={position.id} className="flex items-center gap-1">
								<input
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
									className="inline-block size-3 rounded-sm"
									style={{ backgroundColor: position.color }}
								/>
								{position.name}
							</label>
						))}
					</div>
				</fieldset>
			)}

			<div className="space-y-1">
				<label htmlFor={`${id}-memo`} className="font-semibold">
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
					className={`${control} block w-full`}
				/>
				<p id={`${id}-memo-count`} className="text-xs text-gray-600">
					{memo.length} / {PREFERENCE_MEMO_MAX} 文字
				</p>
			</div>

			{errors.length > 0 && (
				<ul role="alert" className="text-sm text-red-700">
					{errors.map((message) => (
						<li key={message}>{message}</li>
					))}
				</ul>
			)}

			<button
				type="submit"
				disabled={disabled || errors.length > 0}
				className={primary}
			>
				{submitLabel}
			</button>
		</form>
	);
};

export default PreferenceForm;
