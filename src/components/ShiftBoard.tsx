import { useRouter } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import {
	createShift,
	deleteShift,
	type ShiftMutationResult,
	updateShift,
} from "../server/shifts.functions";
import type { ShiftScopeParams } from "../lib/shift-scope";
import type { Role, Shift, ShiftStatus, Staff } from "../types";
import ShiftForm, { type ShiftFormValue } from "./ShiftForm";
import ShiftTimeline from "./ShiftTimeline";
import { listShiftDays, toMs } from "./timeline/layout";

type ShiftPayload = ShiftFormValue & { status: ShiftStatus };

/** 取り消し（FR-4-G）のために覚えておく、直前の 1 手 */
type LastAction =
	| { type: "update"; id: string; before: ShiftPayload; label: string }
	| { type: "create"; id: string; label: string }
	| { type: "delete"; before: ShiftPayload; label: string };

const toPayload = (
	shift: Shift,
	range?: { start: number; end: number },
): ShiftPayload => ({
	staffId: shift.staffId,
	roleId: shift.roleId,
	timeRange: {
		start: new Date(range?.start ?? toMs(shift.timeRange.start)).toISOString(),
		end: new Date(range?.end ?? toMs(shift.timeRange.end)).toISOString(),
	},
	isPreferredRole: shift.isPreferredRole,
	status: shift.status as ShiftStatus,
});

const DEFAULT_START_HOUR_MS = 9 * 60 * 60_000;

/**
 * タイムラインと、その編集（閲覧 / 編集モード FR-4-F・作成 FR-4-B・取り消し FR-4-G）をまとめる。
 * 保存は server function で行い、保存できたら loader を読み直す
 */
const ShiftBoard = ({
	shifts,
	roles,
	staffs,
	timeUnitMinutes,
	newShiftStatus,
	scope,
	canEdit,
}: {
	shifts: Shift[];
	roles: Role[];
	staffs: Staff[];
	timeUnitMinutes: number;
	/** この画面で作るシフトの status */
	newShiftStatus: ShiftStatus;
	/** シフトの単位（団体・テナント・イベント）。保存はこの単位に対して行う */
	scope: ShiftScopeParams;
	/** 編集できる役割か（できなければ編集モードを出さない。守りはサーバー側） */
	canEdit: boolean;
}) => {
	const router = useRouter();
	const create = useServerFn(createShift);
	const update = useServerFn(updateShift);
	const remove = useServerFn(deleteShift);

	const [editMode, setEditMode] = useState(false);
	const [busy, setBusy] = useState(false);
	const [errors, setErrors] = useState<string[]>([]);
	const [lastAction, setLastAction] = useState<LastAction | null>(null);

	/** 保存を 1 回行う。できたら onDone を呼んで画面を読み直し、true を返す */
	const run = async (
		mutate: () => Promise<ShiftMutationResult>,
		onDone: (shift: Shift) => void,
	): Promise<boolean> => {
		setBusy(true);
		try {
			const result = await mutate();
			if (!result.ok) {
				setErrors(result.errors);
				return false;
			}
			setErrors([]);
			onDone(result.shift);
			await router.invalidate();
			return true;
		} catch (error) {
			console.error(error);
			setErrors(["保存できませんでした。時間をおいて、もう一度試してください"]);
			return false;
		} finally {
			setBusy(false);
		}
	};

	const handleChangeTime = (shift: Shift, start: number, end: number) =>
		run(
			() =>
				update({
					data: {
						scope,
						id: shift.id,
						input: toPayload(shift, { start, end }),
					},
				}),
			() =>
				setLastAction({
					type: "update",
					id: shift.id,
					before: toPayload(shift),
					label: "時間の変更",
				}),
		);

	const handleDelete = (shift: Shift) => {
		void run(
			() => remove({ data: { scope, id: shift.id } }),
			() =>
				setLastAction({
					type: "delete",
					before: toPayload(shift),
					label: "削除",
				}),
		);
	};

	const handleCreate = (value: ShiftFormValue) =>
		run(
			() =>
				create({
					data: { scope, input: { ...value, status: newShiftStatus } },
				}),
			(shift) => setLastAction({ type: "create", id: shift.id, label: "作成" }),
		);

	const handleUndo = () => {
		if (!lastAction) return;
		const clear = () => setLastAction(null);
		switch (lastAction.type) {
			case "update":
				void run(
					() =>
						update({
							data: { scope, id: lastAction.id, input: lastAction.before },
						}),
					clear,
				);
				break;
			case "create":
				void run(() => remove({ data: { scope, id: lastAction.id } }), clear);
				break;
			case "delete":
				void run(
					() => create({ data: { scope, input: lastAction.before } }),
					clear,
				);
				break;
		}
	};

	const firstDay = listShiftDays(shifts)[0];

	return (
		<div className="space-y-3">
			{canEdit && (
				<div className="flex flex-wrap items-center justify-end gap-3">
					{editMode && (
						<button
							type="button"
							onClick={handleUndo}
							disabled={!lastAction || busy}
							className="rounded border px-3 py-1 text-sm disabled:opacity-40"
						>
							{lastAction ? `元に戻す（${lastAction.label}）` : "元に戻す"}
						</button>
					)}
					<div
						role="group"
						aria-label="操作モード"
						className="flex rounded border"
					>
						{[
							{ value: false, label: "閲覧" },
							{ value: true, label: "編集" },
						].map((option) => (
							<button
								key={option.label}
								type="button"
								aria-pressed={editMode === option.value}
								onClick={() => setEditMode(option.value)}
								className={`px-3 py-1 text-sm ${editMode === option.value ? "bg-gray-800 text-white" : ""}`}
							>
								{option.label}
							</button>
						))}
					</div>
				</div>
			)}

			{errors.length > 0 && (
				<ul
					role="alert"
					className="rounded border border-red-300 bg-red-50 p-2 text-sm text-red-800"
				>
					{errors.map((message) => (
						<li key={message}>{message}</li>
					))}
				</ul>
			)}

			{canEdit && editMode && (
				<ShiftForm
					roles={roles}
					staffs={staffs}
					timeUnitMinutes={timeUnitMinutes}
					defaultStart={
						firstDay !== undefined
							? firstDay + DEFAULT_START_HOUR_MS
							: Date.now()
					}
					busy={busy}
					onSubmit={handleCreate}
				/>
			)}

			<ShiftTimeline
				shifts={shifts}
				roles={roles}
				staffs={staffs}
				timeUnitMinutes={timeUnitMinutes}
				editing={
					canEdit && editMode
						? { onChangeTime: handleChangeTime, onDelete: handleDelete }
						: undefined
				}
			/>
		</div>
	);
};

export default ShiftBoard;
