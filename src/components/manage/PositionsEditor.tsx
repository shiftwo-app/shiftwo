import { useServerFn } from "@tanstack/react-start";
import { useId, useState } from "react";
import type { FormEvent } from "react";
import type { PositionInput } from "../../lib/manage-schemas";
import type { ShiftScopeParams } from "../../lib/shift-scope";
import {
	createPositionFn,
	deletePositionFn,
	updatePositionFn,
} from "../../server/manage.functions";
import type { Position } from "../../types";
import {
	nextPositionColor,
	POSITION_COLOR_SWATCHES,
} from "../../lib/position-colors";
import Button from "../ui/Button";
import PositionColorField from "./PositionColorField";
import ConfirmButton from "./ConfirmButton";
import type { RunMutation } from "./useMutationRunner";
import { useT } from "../../lib/i18n/react";

// 一覧の行ではラベルを隠し（列が並んで読めるので）、新しく作るフォームでは見せる
const labelClass = (visible: boolean) =>
	visible ? "text-sm font-bold text-ink" : "sr-only";

/** 持ち場を 1 つ編集する（なければ新しく作る）フォーム */
function PositionForm({
	scope,
	position,
	defaultColor,
	run,
}: {
	scope: ShiftScopeParams;
	position?: Position;
	/** 新しく作るときの色（まだ使われていない見本） */
	defaultColor?: string;
	run: RunMutation;
}) {
	const create = useServerFn(createPositionFn);
	const update = useServerFn(updatePositionFn);
	const remove = useServerFn(deletePositionFn);
	const t = useT();
	const id = useId();
	const [name, setName] = useState(position?.name ?? "");
	const [color, setColor] = useState(
		position?.color ?? defaultColor ?? POSITION_COLOR_SWATCHES[0].color,
	);
	const [required, setRequired] = useState(position?.requiredStaffCount ?? 1);
	const [isBreak, setIsBreak] = useState(position?.isBreak ?? false);

	const submit = async (event: FormEvent<HTMLFormElement>) => {
		event.preventDefault();
		const input: PositionInput = {
			name,
			color,
			requiredStaffCount: required,
			isBreak,
		};
		const ok = await run(() =>
			position
				? update({ data: { scope, positionId: position.id, position: input } })
				: create({ data: { scope, position: input } }),
		);
		if (ok && !position) {
			setName("");
			setRequired(1);
			setIsBreak(false);
		}
	};

	const isNew = !position;
	return (
		<form
			onSubmit={submit}
			className="flex flex-wrap items-end gap-x-3 gap-y-2 text-sm"
		>
			<PositionColorField
				id={`${id}-color`}
				color={color}
				onChange={setColor}
				label={t("settings.color")}
				labelClassName={labelClass(isNew)}
			/>
			<div className="flex min-w-40 flex-1 flex-col gap-1">
				<label htmlFor={`${id}-name`} className={labelClass(isNew)}>
					{t("settings.positionName")}
				</label>
				<input
					id={`${id}-name`}
					required
					maxLength={40}
					placeholder={t("settings.positionNamePlaceholder")}
					value={name}
					onChange={(event) => setName(event.target.value)}
					className="control w-full"
				/>
			</div>
			<label
				htmlFor={`${id}-required`}
				className={
					isNew
						? "flex flex-col gap-1 text-sm font-bold text-ink"
						: "flex items-center gap-2 text-xs text-ink-muted"
				}
			>
				{t("settings.requiredStaffCount")}
				<input
					id={`${id}-required`}
					type="number"
					min={0}
					max={99}
					value={required}
					onChange={(event) => setRequired(Number(event.target.value))}
					className="control tabular w-20 font-normal"
				/>
			</label>
			<label className="flex items-center gap-2 text-xs text-ink-muted">
				<input
					type="checkbox"
					checked={isBreak}
					onChange={(event) => setIsBreak(event.target.checked)}
					className="size-4 accent-primary"
				/>
				{t("settings.positionIsBreak")}
			</label>
			<div className="flex flex-wrap items-center gap-2">
				<Button
					type="submit"
					variant={isNew ? "primary" : "secondary"}
					size={isNew ? "md" : "sm"}
				>
					{position ? t("common.save") : t("settings.positionCreate")}
				</Button>
				{position && (
					<ConfirmButton
						label={t("common.delete")}
						confirmLabel={t("settings.positionDeleteConfirm")}
						onConfirm={() =>
							void run(() =>
								remove({ data: { scope, positionId: position.id } }),
							)
						}
					/>
				)}
			</div>
		</form>
	);
}

/** 持ち場の一覧と編集（日常シフトならテナント、イベントならそのイベントの持ち場） */
const PositionsEditor = ({
	scope,
	positions,
	run,
}: {
	scope: ShiftScopeParams;
	positions: Position[];
	run: RunMutation;
}) => {
	const t = useT();
	const nextColor = nextPositionColor(
		positions.map((position) => position.color),
	);
	return (
		<div className="space-y-4">
			{positions.length === 0 ? (
				<p className="text-sm text-ink-muted">{t("settings.positionsEmpty")}</p>
			) : (
				<ul className="divide-y divide-line rounded-lg border border-line bg-surface">
					{positions.map((position) => (
						<li
							key={`${position.id}-${position.name}-${position.color}-${position.requiredStaffCount}-${position.isBreak}`}
							className="px-4 py-3"
						>
							<PositionForm scope={scope} position={position} run={run} />
						</li>
					))}
				</ul>
			)}
			<div className="rounded-lg border border-dashed border-line-strong p-4">
				{/* 持ち場が増えたら、次の色で作り直す（名前などの入力も空に戻る） */}
				<PositionForm
					key={nextColor}
					scope={scope}
					defaultColor={nextColor}
					run={run}
				/>
			</div>
		</div>
	);
};

export default PositionsEditor;
