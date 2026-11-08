import { useId, useState } from "react";
import type { FormEvent } from "react";
import { TIME_UNIT_OPTIONS } from "../../lib/manage-schemas";
import Button from "../ui/Button";

const fieldLabel = "flex flex-col gap-1 text-sm font-bold text-ink";

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
		<form onSubmit={submit} className="space-y-4">
			<div className="grid gap-4 sm:grid-cols-2">
				<label htmlFor={`${id}-name`} className={fieldLabel}>
					{label}名
					<input
						id={`${id}-name`}
						required
						maxLength={80}
						value={name}
						onChange={(event) => setName(event.target.value)}
						className="control font-normal"
					/>
				</label>
				<label htmlFor={`${id}-slug`} className={fieldLabel}>
					<span>
						URL 名
						<span className="font-normal text-ink-muted">
							（半角の英小文字・数字・ハイフン）
						</span>
					</span>
					<input
						id={`${id}-slug`}
						required
						minLength={3}
						maxLength={32}
						value={slug}
						onChange={(event) => setSlug(event.target.value.toLowerCase())}
						className="control font-normal"
					/>
				</label>
				<label htmlFor={`${id}-unit`} className={fieldLabel}>
					時間粒度
					<select
						id={`${id}-unit`}
						value={timeUnit ?? ""}
						onChange={(event) =>
							setTimeUnit(
								event.target.value === "" ? null : Number(event.target.value),
							)
						}
						className="control font-normal sm:max-w-48"
					>
						{kind === "event" && <option value="">テナントと同じ</option>}
						{TIME_UNIT_OPTIONS.map((minutes) => (
							<option key={minutes} value={minutes}>
								{minutes} 分
							</option>
						))}
					</select>
				</label>
			</div>
			<Button type="submit" variant="primary">
				{submitLabel}
			</Button>
		</form>
	);
};

export default TenantOrEventForm;
