import { useId, useState } from "react";
import type { FormEvent } from "react";
import type { Position, Staff } from "../types";
import {
	fromDateTimeInputValue,
	toDateTimeInputValue,
} from "./timeline/datetime";
import { MINUTE_MS } from "./timeline/layout";

/** 作成フォームで決めた値（status は画面の側で付ける） */
export type ShiftFormValue = {
	staffId: string;
	positionId: string;
	timeRange: { start: string; end: string };
	isPreferredPosition: boolean;
};

/**
 * シフトを作るフォーム（FR-4-B）。開始・終了を入力して枠を作る。
 * 時刻は日本時間として扱い、入力の刻みは時間粒度に合わせる
 */
const ShiftForm = ({
	positions,
	staffs,
	timeUnitMinutes,
	defaultStart,
	busy,
	onSubmit,
}: {
	positions: Position[];
	staffs: Staff[];
	timeUnitMinutes: number;
	/** 開始の初期値（ms） */
	defaultStart: number;
	busy: boolean;
	/** 作れたら true */
	onSubmit: (value: ShiftFormValue) => Promise<boolean>;
}) => {
	const id = useId();
	const [staffId, setStaffId] = useState(staffs[0]?.id ?? "");
	const [positionId, setPositionId] = useState(positions[0]?.id ?? "");
	const [start, setStart] = useState(toDateTimeInputValue(defaultStart));
	const [end, setEnd] = useState(
		toDateTimeInputValue(defaultStart + 60 * MINUTE_MS),
	);
	const [isPreferredPosition, setIsPreferredPosition] = useState(true);
	const [formError, setFormError] = useState<string | null>(null);

	const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
		event.preventDefault();
		const startIso = fromDateTimeInputValue(start);
		const endIso = fromDateTimeInputValue(end);
		if (!staffId || !positionId || !startIso || !endIso) {
			setFormError("スタッフ・持ち場・開始・終了をすべて入力してください");
			return;
		}
		setFormError(null);
		await onSubmit({
			staffId,
			positionId,
			timeRange: { start: startIso, end: endIso },
			isPreferredPosition,
		});
	};

	const field = "flex flex-col gap-1 text-sm";
	const control = "rounded border px-2 py-1";

	return (
		<form
			aria-label="シフトを作る"
			onSubmit={handleSubmit}
			className="flex flex-wrap items-end gap-3 rounded border p-3"
		>
			<label htmlFor={`${id}-staff`} className={field}>
				スタッフ
				<select
					id={`${id}-staff`}
					value={staffId}
					onChange={(event) => setStaffId(event.target.value)}
					className={control}
				>
					{staffs.map((staff) => (
						<option key={staff.id} value={staff.id}>
							{staff.name}
						</option>
					))}
				</select>
			</label>
			<label htmlFor={`${id}-position`} className={field}>
				持ち場
				<select
					id={`${id}-position`}
					value={positionId}
					onChange={(event) => setPositionId(event.target.value)}
					className={control}
				>
					{positions.map((position) => (
						<option key={position.id} value={position.id}>
							{position.name}
						</option>
					))}
				</select>
			</label>
			<label htmlFor={`${id}-start`} className={field}>
				開始
				<input
					id={`${id}-start`}
					type="datetime-local"
					step={timeUnitMinutes * 60}
					value={start}
					onChange={(event) => setStart(event.target.value)}
					className={control}
				/>
			</label>
			<label htmlFor={`${id}-end`} className={field}>
				終了
				<input
					id={`${id}-end`}
					type="datetime-local"
					step={timeUnitMinutes * 60}
					value={end}
					onChange={(event) => setEnd(event.target.value)}
					className={control}
				/>
			</label>
			<label className="flex items-center gap-1 pb-1 text-sm">
				<input
					type="checkbox"
					checked={isPreferredPosition}
					onChange={(event) => setIsPreferredPosition(event.target.checked)}
				/>
				希望どおりの持ち場
			</label>
			<button
				type="submit"
				disabled={busy}
				className="rounded bg-blue-600 px-4 py-1.5 text-sm font-semibold text-white disabled:opacity-50"
			>
				作る
			</button>
			{formError && (
				<p role="alert" className="w-full text-sm text-red-700">
					{formError}
				</p>
			)}
		</form>
	);
};

export default ShiftForm;
