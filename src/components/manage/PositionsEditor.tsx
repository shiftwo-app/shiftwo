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
import Button from "../ui/Button";
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
	run,
}: {
	scope: ShiftScopeParams;
	position?: Position;
	run: RunMutation;
}) {
	const create = useServerFn(createPositionFn);
	const update = useServerFn(updatePositionFn);
	const remove = useServerFn(deletePositionFn);
	const t = useT();
	const id = useId();
	const [name, setName] = useState(position?.name ?? "");
	const [color, setColor] = useState(position?.color ?? "#3B82F6");
	const [required, setRequired] = useState(position?.requiredStaffCount ?? 1);

	const submit = async (event: FormEvent<HTMLFormElement>) => {
		event.preventDefault();
		const input: PositionInput = { name, color, requiredStaffCount: required };
		const ok = await run(() =>
			position
				? update({ data: { scope, positionId: position.id, position: input } })
				: create({ data: { scope, position: input } }),
		);
		if (ok && !position) {
			setName("");
			setRequired(1);
		}
	};

	const isNew = !position;
	return (
		<form
			onSubmit={submit}
			className="flex flex-wrap items-end gap-x-3 gap-y-2 text-sm"
		>
			<div className="flex flex-col gap-1">
				<label htmlFor={`${id}-color`} className={labelClass(isNew)}>
					{t("settings.color")}
				</label>
				{/* ブラウザの色の入力欄はそのまま使い、まわりの枠だけ入力欄にそろえる */}
				<span className="inline-flex h-[2.125rem] w-11 items-center justify-center rounded-md border border-line-strong bg-surface hover:border-ink-muted focus-within:border-primary">
					<input
						id={`${id}-color`}
						type="color"
						value={color}
						onChange={(event) => setColor(event.target.value)}
						className="h-6 w-8 cursor-pointer rounded-sm border-0 bg-transparent p-0"
					/>
				</span>
			</div>
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
	return (
		<div className="space-y-4">
			{positions.length === 0 ? (
				<p className="text-sm text-ink-muted">{t("settings.positionsEmpty")}</p>
			) : (
				<ul className="divide-y divide-line rounded-lg border border-line bg-surface">
					{positions.map((position) => (
						<li
							key={`${position.id}-${position.name}-${position.color}-${position.requiredStaffCount}`}
							className="px-4 py-3"
						>
							<PositionForm scope={scope} position={position} run={run} />
						</li>
					))}
				</ul>
			)}
			<div className="rounded-lg border border-dashed border-line-strong p-4">
				<PositionForm scope={scope} run={run} />
			</div>
		</div>
	);
};

export default PositionsEditor;
