import { useId, useState } from "react";
import type { FormEvent } from "react";
import { useT } from "../lib/i18n/react";
import type { Position, Staff } from "../types";
import {
	fromDateTimeInputValue,
	toDateTimeInputValue,
} from "./timeline/datetime";
import { MINUTE_MS } from "./timeline/layout";
import Button from "./ui/Button";

/** 作成フォームで決めた値（status は画面の側で付ける） */
export type ShiftFormValue = {
	staffId: string;
	/** 持ち場を使わない単位では null */
	positionId: string | null;
	timeRange: { start: string; end: string };
	isPreferredPosition: boolean;
};

/**
 * シフトを作るフォーム（FR-4-B）。開始・終了を入力して枠を作る。
 * 時刻は日本時間として扱い、入力の刻みは時間粒度に合わせる
 */
const ShiftForm = ({
	positions,
	positionsEnabled = true,
	staffs,
	timeUnitMinutes,
	defaultStart,
	busy,
	onSubmit,
}: {
	positions: Position[];
	/** 持ち場を使うか。使わないなら、持ち場を選ばせない */
	positionsEnabled?: boolean;
	staffs: Staff[];
	timeUnitMinutes: number;
	/** 開始の初期値（ms） */
	defaultStart: number;
	busy: boolean;
	/** 作れたら true */
	onSubmit: (value: ShiftFormValue) => Promise<boolean>;
}) => {
	const t = useT();
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
		if (!staffId || (positionsEnabled && !positionId) || !startIso || !endIso) {
			setFormError(
				positionsEnabled
					? t("board.formRequiredWithPosition")
					: t("board.formRequired"),
			);
			return;
		}
		setFormError(null);
		await onSubmit({
			staffId,
			positionId: positionsEnabled ? positionId : null,
			timeRange: { start: startIso, end: endIso },
			// 持ち場を使わないなら、持ち場の希望は問わない
			isPreferredPosition: positionsEnabled ? isPreferredPosition : true,
		});
	};

	// ラベルは Field と同じ見た目（太字の小さめの文字）。入力欄は .control
	const field = "flex min-w-0 flex-col gap-1 text-sm font-bold text-ink";
	const control = "control w-full font-normal tabular";

	return (
		<form
			aria-label={t("board.formTitle")}
			onSubmit={handleSubmit}
			className="space-y-3 rounded-lg border border-line bg-surface p-4"
		>
			<p className="text-sm leading-snug font-bold text-ink">
				{t("board.formTitle")}
			</p>
			<div className="grid items-end gap-3 sm:grid-cols-2 lg:grid-cols-[repeat(4,minmax(0,1fr))_auto_auto]">
				<label htmlFor={`${id}-staff`} className={field}>
					{t("board.formStaff")}
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
				{positionsEnabled && (
					<label htmlFor={`${id}-position`} className={field}>
						{t("board.formPosition")}
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
				)}
				<label htmlFor={`${id}-start`} className={field}>
					{t("board.formStart")}
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
					{t("board.formEnd")}
					<input
						id={`${id}-end`}
						type="datetime-local"
						step={timeUnitMinutes * 60}
						value={end}
						onChange={(event) => setEnd(event.target.value)}
						className={control}
					/>
				</label>
				{positionsEnabled && (
					<label className="flex h-9 items-center gap-2 text-sm text-ink">
						<input
							type="checkbox"
							className="size-4 accent-primary"
							checked={isPreferredPosition}
							onChange={(event) => setIsPreferredPosition(event.target.checked)}
						/>
						{t("board.formPreferredPosition")}
					</label>
				)}
				<Button type="submit" variant="primary" disabled={busy}>
					{t("board.formSubmit")}
				</Button>
			</div>
			{formError && (
				<p role="alert" className="text-sm font-bold text-danger">
					{formError}
				</p>
			)}
		</form>
	);
};

export default ShiftForm;
