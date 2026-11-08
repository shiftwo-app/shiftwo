import { useId, useState } from "react";
import type { FormEvent } from "react";
import type { Role, Staff } from "../types";
import {
	fromDateTimeInputValue,
	toDateTimeInputValue,
} from "./timeline/datetime";
import { MINUTE_MS } from "./timeline/layout";

/** 作成フォームで決めた値（status は画面の側で付ける） */
export type ShiftFormValue = {
	staffId: string;
	roleId: string;
	timeRange: { start: string; end: string };
	isPreferredRole: boolean;
};

/**
 * シフトを作るフォーム（FR-4-B）。開始・終了を入力して枠を作る。
 * 時刻は日本時間として扱い、入力の刻みは時間粒度に合わせる
 */
const ShiftForm = ({
	roles,
	staffs,
	timeUnitMinutes,
	defaultStart,
	busy,
	onSubmit,
}: {
	roles: Role[];
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
	const [roleId, setRoleId] = useState(roles[0]?.id ?? "");
	const [start, setStart] = useState(toDateTimeInputValue(defaultStart));
	const [end, setEnd] = useState(
		toDateTimeInputValue(defaultStart + 60 * MINUTE_MS),
	);
	const [isPreferredRole, setIsPreferredRole] = useState(true);
	const [formError, setFormError] = useState<string | null>(null);

	const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
		event.preventDefault();
		const startIso = fromDateTimeInputValue(start);
		const endIso = fromDateTimeInputValue(end);
		if (!staffId || !roleId || !startIso || !endIso) {
			setFormError("スタッフ・役割・開始・終了をすべて入力してください");
			return;
		}
		setFormError(null);
		await onSubmit({
			staffId,
			roleId,
			timeRange: { start: startIso, end: endIso },
			isPreferredRole,
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
			<label htmlFor={`${id}-role`} className={field}>
				役割
				<select
					id={`${id}-role`}
					value={roleId}
					onChange={(event) => setRoleId(event.target.value)}
					className={control}
				>
					{roles.map((role) => (
						<option key={role.id} value={role.id}>
							{role.name}
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
					checked={isPreferredRole}
					onChange={(event) => setIsPreferredRole(event.target.checked)}
				/>
				希望どおりの役割
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
