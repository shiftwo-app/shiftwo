import { useId, useState } from "react";
import type { FormEvent } from "react";
import { TIME_UNIT_OPTIONS } from "../../lib/manage-schemas";

const control = "rounded border px-2 py-1";
const primary =
	"rounded bg-blue-600 px-3 py-1 text-sm font-semibold text-white disabled:opacity-50";

export type TenantOrEventValue = {
	name: string;
	slug: string;
	timeUnitMinutes: number | null;
};

/**
 * テナント・イベントの名前・URL 名・時間粒度のフォーム。
 * イベントは時間粒度を「テナントと同じ」（null）にできる
 */
const TenantOrEventForm = ({
	kind,
	initial,
	submitLabel,
	onSubmit,
}: {
	kind: "tenant" | "event";
	initial?: TenantOrEventValue;
	submitLabel: string;
	onSubmit: (value: TenantOrEventValue) => Promise<boolean>;
}) => {
	const id = useId();
	const label = kind === "tenant" ? "テナント" : "イベント";
	const [name, setName] = useState(initial?.name ?? "");
	const [slug, setSlug] = useState(initial?.slug ?? "");
	const [timeUnit, setTimeUnit] = useState<number | null>(
		initial ? initial.timeUnitMinutes : kind === "tenant" ? 15 : null,
	);

	const submit = async (event: FormEvent<HTMLFormElement>) => {
		event.preventDefault();
		const ok = await onSubmit({ name, slug, timeUnitMinutes: timeUnit });
		if (ok && !initial) {
			setName("");
			setSlug("");
		}
	};

	return (
		<form onSubmit={submit} className="flex flex-wrap items-end gap-3 text-sm">
			<label htmlFor={`${id}-name`} className="flex flex-col gap-1">
				{label}名
				<input
					id={`${id}-name`}
					required
					maxLength={80}
					value={name}
					onChange={(event) => setName(event.target.value)}
					className={control}
				/>
			</label>
			<label htmlFor={`${id}-slug`} className="flex flex-col gap-1">
				URL 名（半角の英小文字・数字・ハイフン）
				<input
					id={`${id}-slug`}
					required
					minLength={3}
					maxLength={32}
					value={slug}
					onChange={(event) => setSlug(event.target.value.toLowerCase())}
					className={control}
				/>
			</label>
			<label htmlFor={`${id}-unit`} className="flex flex-col gap-1">
				時間粒度
				<select
					id={`${id}-unit`}
					value={timeUnit ?? ""}
					onChange={(event) =>
						setTimeUnit(
							event.target.value === "" ? null : Number(event.target.value),
						)
					}
					className={control}
				>
					{kind === "event" && <option value="">テナントと同じ</option>}
					{TIME_UNIT_OPTIONS.map((minutes) => (
						<option key={minutes} value={minutes}>
							{minutes} 分
						</option>
					))}
				</select>
			</label>
			<button type="submit" className={primary}>
				{submitLabel}
			</button>
		</form>
	);
};

export default TenantOrEventForm;
