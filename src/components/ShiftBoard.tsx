import { useRouter } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useRef, useState } from "react";
import {
	createShift,
	deleteShift,
	type ShiftMutationResult,
	updateShift,
} from "../server/shifts.functions";
import { useT } from "../lib/i18n/react";
import type { MessageKey } from "../lib/i18n/messages";
import type { RealtimeTransport } from "../lib/realtime/types";
import type { ShiftScopeParams } from "../lib/shift-scope";
import type { Position, Shift, ShiftStatus, Staff } from "../types";
import ShiftForm, { type ShiftFormValue } from "./ShiftForm";
import ShiftTimeline from "./ShiftTimeline";
import Alert from "./ui/Alert";
import Button from "./ui/Button";
import { listShiftDays, toMs } from "./timeline/layout";
import { type LiveStatus, useShiftBoardLive } from "./useShiftBoardLive";

type ShiftPayload = ShiftFormValue & { status: ShiftStatus };

/** 取り消し（FR-4-G）のために覚えておく、直前の 1 手 */
type LastAction =
	| {
			type: "update";
			id: string;
			/** 自分が変えたあとの version（そのあとにほかの人が変えていたら、元に戻さない） */
			version: number;
			before: ShiftPayload;
			label: MessageKey;
	  }
	| { type: "create"; id: string; version: number; label: MessageKey }
	| { type: "delete"; before: ShiftPayload; label: MessageKey };

/** ほかの人の変更が続けて届いたとき、まとめて 1 回だけ読み直すための待ち時間 */
const REFRESH_DEBOUNCE_MS = 200;

const LIVE_LABEL: Record<LiveStatus, MessageKey> = {
	connecting: "board.liveConnecting",
	live: "board.liveLive",
	offline: "board.liveOffline",
};

const toPayload = (
	shift: Shift,
	range?: { start: number; end: number },
): ShiftPayload => ({
	staffId: shift.staffId,
	positionId: shift.positionId,
	timeRange: {
		start: new Date(range?.start ?? toMs(shift.timeRange.start)).toISOString(),
		end: new Date(range?.end ?? toMs(shift.timeRange.end)).toISOString(),
	},
	isPreferredPosition: shift.isPreferredPosition,
	status: shift.status as ShiftStatus,
});

const DEFAULT_START_HOUR_MS = 9 * 60 * 60_000;

/**
 * タイムラインと、その編集（閲覧 / 編集モード FR-4-F・作成 FR-4-B・取り消し FR-4-G）をまとめる。
 * 保存は server function で行い、保存できたら loader を読み直す。
 * 同時編集：ほかの人の変更が届いたら読み直す。保存は、読んだときの version のままのときだけ通る
 * （先に変えられていたら、知らせて読み直す）
 */
const ShiftBoard = ({
	shifts,
	positions,
	staffs,
	timeUnitMinutes,
	newShiftStatus,
	scope,
	canEdit,
	liveTransport,
	preferenceConflicts,
	positionsEnabled,
}: {
	shifts: Shift[];
	positions: Position[];
	staffs: Staff[];
	timeUnitMinutes: number;
	/** この画面で作るシフトの status */
	newShiftStatus: ShiftStatus;
	/** シフトの単位（団体・テナント・イベント）。保存はこの単位に対して行う */
	scope: ShiftScopeParams;
	/** 編集できる権限か（できなければ編集モードを出さない。守りはサーバー側） */
	canEdit: boolean;
	/** ほかの人の変更を受け取る方式 */
	liveTransport: RealtimeTransport;
	/** 希望と違う割り当て（FR-4-E）：シフトの ID → 理由 */
	preferenceConflicts: Record<string, string[]>;
	/** 持ち場を使うか */
	positionsEnabled: boolean;
}) => {
	const t = useT();
	const router = useRouter();
	const create = useServerFn(createShift);
	const update = useServerFn(updateShift);
	const remove = useServerFn(deleteShift);

	const [editMode, setEditMode] = useState(false);
	const [busy, setBusy] = useState(false);
	const [errors, setErrors] = useState<string[]>([]);
	const [lastAction, setLastAction] = useState<LastAction | null>(null);

	// ほかの人の変更が届いたら、まとめて読み直す
	const refreshTimer = useRef<ReturnType<typeof setTimeout> | undefined>(
		undefined,
	);
	useEffect(() => () => clearTimeout(refreshTimer.current), []);
	const liveStatus = useShiftBoardLive(scope, liveTransport, () => {
		clearTimeout(refreshTimer.current);
		refreshTimer.current = setTimeout(() => {
			void router.invalidate();
		}, REFRESH_DEBOUNCE_MS);
	});

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
				// ほかの人が先に変えていたら、最新を見せる（元に戻すも、もう使えない）
				if (result.conflict) {
					setLastAction(null);
					await router.invalidate();
				}
				return false;
			}
			setErrors([]);
			onDone(result.shift);
			await router.invalidate();
			return true;
		} catch (error) {
			console.error(error);
			setErrors([t("board.saveFailed")]);
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
						version: shift.version,
						input: toPayload(shift, { start, end }),
					},
				}),
			(saved) =>
				setLastAction({
					type: "update",
					id: shift.id,
					version: saved.version,
					before: toPayload(shift),
					label: "board.actionChangeTime",
				}),
		);

	const handleDelete = (shift: Shift) => {
		void run(
			() => remove({ data: { scope, id: shift.id, version: shift.version } }),
			() =>
				setLastAction({
					type: "delete",
					before: toPayload(shift),
					label: "board.actionDelete",
				}),
		);
	};

	const handleCreate = (value: ShiftFormValue) =>
		run(
			() =>
				create({
					data: { scope, input: { ...value, status: newShiftStatus } },
				}),
			(shift) =>
				setLastAction({
					type: "create",
					id: shift.id,
					version: shift.version,
					label: "board.actionCreate",
				}),
		);

	const handleUndo = () => {
		if (!lastAction) return;
		const clear = () => setLastAction(null);
		switch (lastAction.type) {
			case "update":
				void run(
					() =>
						update({
							data: {
								scope,
								id: lastAction.id,
								version: lastAction.version,
								input: lastAction.before,
							},
						}),
					clear,
				);
				break;
			case "create":
				void run(
					() =>
						remove({
							data: { scope, id: lastAction.id, version: lastAction.version },
						}),
					clear,
				);
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
		<div className="space-y-4">
			<div className="flex flex-wrap items-center justify-between gap-3">
				<p
					role="status"
					className="flex items-center gap-2 text-xs text-ink-muted"
				>
					{/* つながっているときだけ、印をゆっくり脈打たせる（動きを減らす設定では止める） */}
					<span aria-hidden="true" className="relative inline-flex size-2">
						{liveStatus === "live" && (
							<span className="absolute inset-0 rounded-full bg-brand opacity-60 motion-safe:animate-ping" />
						)}
						<span
							className={`relative inline-block size-2 rounded-full ${liveStatus === "live" ? "bg-brand" : liveStatus === "offline" ? "bg-warn" : "bg-line-strong"}`}
						/>
					</span>
					{t(LIVE_LABEL[liveStatus])}
				</p>
				{canEdit && (
					<div className="flex flex-wrap items-center gap-2">
						{editMode && (
							<Button
								size="sm"
								onClick={handleUndo}
								disabled={!lastAction || busy}
							>
								{lastAction
									? t("board.undoWithAction", { action: t(lastAction.label) })
									: t("board.undo")}
							</Button>
						)}
						<div
							role="group"
							aria-label={t("board.modeGroup")}
							className="inline-flex rounded-md border border-line-strong bg-surface p-0.5"
						>
							{[
								{ value: false, label: t("board.modeView") },
								{ value: true, label: t("board.modeEdit") },
							].map((option) => (
								<button
									key={option.label}
									type="button"
									aria-pressed={editMode === option.value}
									onClick={() => setEditMode(option.value)}
									className={`h-7 rounded px-3 text-xs transition-colors ${editMode === option.value ? "bg-ink font-bold text-paper" : "text-ink-muted hover:bg-surface-sunken hover:text-ink"}`}
								>
									{option.label}
								</button>
							))}
						</div>
					</div>
				)}
			</div>

			{errors.length > 0 && (
				<Alert tone="error">
					<ul className="space-y-0.5">
						{errors.map((message) => (
							<li key={message}>{message}</li>
						))}
					</ul>
				</Alert>
			)}

			{canEdit && editMode && (
				<ShiftForm
					positions={positions}
					positionsEnabled={positionsEnabled}
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
				positions={positions}
				staffs={staffs}
				timeUnitMinutes={timeUnitMinutes}
				preferenceConflicts={preferenceConflicts}
				positionsEnabled={positionsEnabled}
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
