import { useRef } from "react";
import { useT } from "../../lib/i18n/react";
import { POSITION_COLOR_SWATCHES } from "../../lib/position-colors";

/**
 * 持ち場の色の入力。ペールトーンの見本から選べ（ボタンで開く）、ブラウザの色の入力欄で自由にも選べる
 */
const PositionColorField = ({
	id,
	color,
	onChange,
	label,
	labelClassName,
}: {
	id: string;
	color: string;
	onChange: (color: string) => void;
	label: string;
	labelClassName: string;
}) => {
	const t = useT();
	const detailsRef = useRef<HTMLDetailsElement>(null);

	return (
		<div className="flex flex-col gap-1">
			<label htmlFor={id} className={labelClassName}>
				{label}
			</label>
			<div className="flex items-center gap-1">
				{/* ブラウザの色の入力欄はそのまま使い、まわりの枠だけ入力欄にそろえる */}
				<span className="inline-flex h-[2.125rem] w-11 items-center justify-center rounded-md border border-line-strong bg-surface hover:border-ink-muted focus-within:border-primary">
					<input
						id={id}
						type="color"
						value={color}
						title={t("settings.colorCustom")}
						onChange={(event) => onChange(event.target.value)}
						className="h-6 w-8 cursor-pointer rounded-sm border-0 bg-transparent p-0"
					/>
				</span>
				<details ref={detailsRef} className="relative">
					<summary
						aria-label={t("settings.colorSwatchesOpen")}
						title={t("settings.colorSwatchesOpen")}
						className="flex h-[2.125rem] cursor-pointer list-none items-center gap-0.5 rounded-md border border-line-strong bg-surface px-1.5 hover:border-ink-muted marker:hidden"
					>
						{POSITION_COLOR_SWATCHES.slice(0, 3).map((swatch) => (
							<span
								key={swatch.color}
								aria-hidden
								className="size-2.5 rounded-full"
								style={{ backgroundColor: swatch.color }}
							/>
						))}
						<span aria-hidden className="ml-0.5 text-xs text-ink-muted">
							▾
						</span>
					</summary>
					<div
						role="group"
						aria-label={t("settings.colorSwatches")}
						className="absolute left-0 z-20 mt-1 grid w-max grid-cols-4 gap-1.5 rounded-lg border border-line bg-surface p-2 shadow-lg"
					>
						{POSITION_COLOR_SWATCHES.map((swatch) => {
							const selected =
								swatch.color.toLowerCase() === color.toLowerCase();
							return (
								<button
									key={swatch.color}
									type="button"
									aria-label={t(swatch.labelKey)}
									aria-pressed={selected}
									title={t(swatch.labelKey)}
									onClick={() => {
										onChange(swatch.color);
										if (detailsRef.current) detailsRef.current.open = false;
									}}
									className={`size-7 rounded-full border border-ink/10 ${selected ? "ring-2 ring-primary ring-offset-2 ring-offset-surface" : ""}`}
									style={{ backgroundColor: swatch.color }}
								/>
							);
						})}
					</div>
				</details>
			</div>
		</div>
	);
};

export default PositionColorField;
