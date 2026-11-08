import { useId } from "react";
import { useT } from "../../lib/i18n/react";
import type { StaffingRule } from "../../lib/staffing";

/**
 * 持ち場の、時間帯ごとの必要人員の入力（基本の人数の上に足す決まり）。
 * 持ち場のフォームの中に置き、持ち場の「保存」でまとめて保存する
 */
const StaffingRulesField = ({
	rules,
	onChange,
	baseCount,
}: {
	rules: StaffingRule[];
	onChange: (rules: StaffingRule[]) => void;
	baseCount: number;
}) => {
	const t = useT();
	const id = useId();
	const update = (index: number, patch: Partial<StaffingRule>) =>
		onChange(
			rules.map((rule, i) => (i === index ? { ...rule, ...patch } : rule)),
		);

	return (
		<details className="group w-full basis-full">
			<summary className="cursor-pointer list-none text-xs text-ink-muted hover:text-ink marker:hidden">
				<span className="mr-1 inline-block transition-transform group-open:rotate-90">
					›
				</span>
				{t("settings.staffingRulesSummary", { count: rules.length })}
			</summary>
			<div className="mt-2 space-y-2 rounded-md bg-surface-sunken p-3">
				<p className="max-w-prose text-xs leading-relaxed text-ink-muted">
					{t("settings.staffingRulesHelp")}
				</p>
				{rules.length > 0 && (
					<table className="text-xs">
						<thead className="text-ink-muted">
							<tr>
								<th scope="col" className="pr-2 pb-1 text-left font-bold">
									{t("settings.staffingRuleDate")}
								</th>
								<th scope="col" className="pr-2 pb-1 text-left font-bold">
									{t("settings.staffingRuleStart")}
								</th>
								<th scope="col" className="pr-2 pb-1 text-left font-bold">
									{t("settings.staffingRuleEnd")}
								</th>
								<th scope="col" className="pr-2 pb-1 text-left font-bold">
									{t("settings.staffingRuleCount")}
								</th>
								<th scope="col" />
							</tr>
						</thead>
						<tbody>
							{rules.map((rule, index) => (
								// 決まりには ID がないので、並びの位置で見分ける（足す・消すは末尾と指定の行だけ）
								// biome-ignore lint/suspicious/noArrayIndexKey: 決まりには ID がない
								<tr key={index}>
									<td className="py-0.5 pr-2">
										<input
											type="date"
											aria-label={`${t("settings.staffingRuleDate")} ${index + 1}`}
											value={rule.date ?? ""}
											onChange={(event) =>
												update(index, { date: event.target.value || null })
											}
											className="control h-8 py-0 text-xs"
										/>
										{!rule.date && (
											<span className="ml-1 text-ink-muted">
												{t("settings.staffingRuleEveryDay")}
											</span>
										)}
									</td>
									<td className="py-0.5 pr-2">
										<input
											type="time"
											step={300}
											aria-label={`${t("settings.staffingRuleStart")} ${index + 1}`}
											value={rule.start}
											onChange={(event) =>
												update(index, { start: event.target.value })
											}
											className="control h-8 py-0 text-xs tabular"
										/>
									</td>
									<td className="py-0.5 pr-2">
										<input
											type="time"
											step={300}
											aria-label={`${t("settings.staffingRuleEnd")} ${index + 1}`}
											value={rule.end === "24:00" ? "00:00" : rule.end}
											onChange={(event) =>
												update(index, { end: event.target.value })
											}
											className="control h-8 py-0 text-xs tabular"
										/>
									</td>
									<td className="py-0.5 pr-2">
										<input
											type="number"
											min={0}
											max={99}
											aria-label={`${t("settings.staffingRuleCount")} ${index + 1}`}
											value={rule.count}
											onChange={(event) =>
												update(index, { count: Number(event.target.value) })
											}
											className="control h-8 w-16 py-0 text-xs tabular"
										/>
									</td>
									<td className="py-0.5">
										<button
											type="button"
											aria-label={t("settings.staffingRuleRemove")}
											title={t("settings.staffingRuleRemove")}
											onClick={() =>
												onChange(rules.filter((_, i) => i !== index))
											}
											className="inline-flex size-7 items-center justify-center rounded-md text-ink-muted hover:bg-surface hover:text-danger"
										>
											<span aria-hidden>×</span>
										</button>
									</td>
								</tr>
							))}
						</tbody>
					</table>
				)}
				<div className="flex flex-wrap items-center gap-3">
					<button
						type="button"
						id={`${id}-add`}
						onClick={() =>
							onChange([
								...rules,
								{
									date: null,
									start: "12:00",
									end: "13:00",
									count: baseCount + 1,
								},
							])
						}
						className="text-xs font-bold text-primary underline underline-offset-4 hover:text-primary-strong"
					>
						{t("settings.staffingRuleAdd")}
					</button>
					<span className="text-xs text-ink-muted">
						{t("settings.staffingRuleSaveHint")}
					</span>
				</div>
			</div>
		</details>
	);
};

export default StaffingRulesField;
