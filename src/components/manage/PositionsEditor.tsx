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
import ConfirmButton from "./ConfirmButton";
import type { RunMutation } from "./useMutationRunner";

const control = "rounded border px-2 py-1";
const primary =
	"rounded bg-blue-600 px-3 py-1 text-sm font-semibold text-white disabled:opacity-50";

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

	return (
		<form
			onSubmit={submit}
			className="flex flex-wrap items-center gap-2 text-sm"
		>
			<label htmlFor={`${id}-name`} className="sr-only">
				持ち場の名前
			</label>
			<input
				id={`${id}-name`}
				required
				maxLength={40}
				placeholder="持ち場の名前（例：受付）"
				value={name}
				onChange={(event) => setName(event.target.value)}
				className={control}
			/>
			<label htmlFor={`${id}-color`} className="sr-only">
				色
			</label>
			<input
				id={`${id}-color`}
				type="color"
				value={color}
				onChange={(event) => setColor(event.target.value)}
				className="h-8 w-10 rounded border"
			/>
			<label htmlFor={`${id}-required`} className="flex items-center gap-1">
				必要な人数
				<input
					id={`${id}-required`}
					type="number"
					min={0}
					max={99}
					value={required}
					onChange={(event) => setRequired(Number(event.target.value))}
					className={`${control} w-16`}
				/>
			</label>
			<button type="submit" className={primary}>
				{position ? "保存" : "持ち場を作る"}
			</button>
			{position && (
				<ConfirmButton
					label="消す"
					confirmLabel="本当に消す（この持ち場のシフトも消えます）"
					onConfirm={() =>
						void run(() => remove({ data: { scope, positionId: position.id } }))
					}
				/>
			)}
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
}) => (
	<div className="space-y-2">
		{positions.length === 0 && (
			<p className="text-sm text-gray-600">まだ持ち場はありません。</p>
		)}
		{positions.map((position) => (
			<PositionForm
				key={`${position.id}-${position.name}-${position.color}-${position.requiredStaffCount}`}
				scope={scope}
				position={position}
				run={run}
			/>
		))}
		<div className="rounded border border-dashed p-2">
			<PositionForm scope={scope} run={run} />
		</div>
	</div>
);

export default PositionsEditor;
