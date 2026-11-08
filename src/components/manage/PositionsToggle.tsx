import { useServerFn } from "@tanstack/react-start";
import { useId } from "react";
import { type PositionsSetting, toPositionsSetting } from "../../lib/positions";
import { setPositionsSettingFn } from "../../server/manage.functions";
import type { RunMutation } from "./useMutationRunner";
import { useT } from "../../lib/i18n/react";

/**
 * 持ち場を使うかの切り替え。団体（scope に tenantSlug なし）は「使う・使わない」、
 * テナント・イベントは「上の単位と同じ・使う・使わない」から選ぶ。選んだらすぐ保存する
 */
const PositionsToggle = ({
	scope,
	value,
	inherited,
	inheritLabel,
	run,
}: {
	scope: { orgSlug: string; tenantSlug?: string; eventSlug?: string };
	/** 今の設定（団体では true / false、テナント・イベントでは null なら上の単位と同じ） */
	value: boolean | null;
	/** 上の単位と同じにしたときの値（団体では渡さない） */
	inherited?: boolean;
	/** 「上の単位と同じ」の言い方（例：団体と同じ） */
	inheritLabel?: string;
	run: RunMutation;
}) => {
	const t = useT();
	const id = useId();
	const setSetting = useServerFn(setPositionsSettingFn);
	const current = toPositionsSetting(value);
	const options: { value: PositionsSetting; label: string }[] = [
		...(inherited !== undefined
			? [
					{
						value: "inherit" as const,
						label: t("settings.positionsInheritOption", {
							label: inheritLabel ?? t("settings.positionsInheritDefault"),
							value: inherited
								? t("settings.positionsOn")
								: t("settings.positionsOff"),
						}),
					},
				]
			: []),
		{ value: "on", label: t("settings.positionsOn") },
		{ value: "off", label: t("settings.positionsOff") },
	];
	return (
		<fieldset className="space-y-2">
			<legend className="sr-only">{t("settings.positionsToggleTitle")}</legend>
			<div className="inline-flex flex-wrap rounded-md border border-line-strong bg-surface p-0.5">
				{options.map((option) => (
					<label
						key={option.value}
						htmlFor={`${id}-${option.value}`}
						className={`cursor-pointer rounded px-3 py-1.5 text-sm transition-colors has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-primary ${
							current === option.value
								? "bg-ink font-bold text-paper"
								: "text-ink-muted hover:text-ink"
						}`}
					>
						<input
							id={`${id}-${option.value}`}
							type="radio"
							name={`${id}-positions`}
							value={option.value}
							checked={current === option.value}
							onChange={() =>
								void run(() =>
									setSetting({ data: { ...scope, setting: option.value } }),
								)
							}
							className="sr-only"
						/>
						{option.label}
					</label>
				))}
			</div>
		</fieldset>
	);
};

export default PositionsToggle;
