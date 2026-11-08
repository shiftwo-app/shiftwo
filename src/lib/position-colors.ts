// 持ち場の色の見本（ペールトーン）。色は団体が自由に決められるが、選びやすいように見本を並べる。
// 明るい画面・暗い画面のどちらでも見分けやすい、中くらいの明るさの淡い色にしている
import type { MessageKey } from "./i18n/messages";

export const POSITION_COLOR_SWATCHES = [
	{ color: "#6FB3AE", labelKey: "settings.colorTeal" },
	{ color: "#7FA7DE", labelKey: "settings.colorBlue" },
	{ color: "#A99BE0", labelKey: "settings.colorLavender" },
	{ color: "#E39AB6", labelKey: "settings.colorRose" },
	{ color: "#EE9A8A", labelKey: "settings.colorCoral" },
	{ color: "#EDB27A", labelKey: "settings.colorApricot" },
	{ color: "#D9C27A", labelKey: "settings.colorSand" },
	{ color: "#93C49A", labelKey: "settings.colorSage" },
] as const satisfies readonly { color: string; labelKey: MessageKey }[];

/** 新しい持ち場の色：まだ使われていない最初の見本（全部使われていれば、数に応じて順に回す） */
export const nextPositionColor = (usedColors: readonly string[]): string => {
	const used = new Set(usedColors.map((color) => color.toLowerCase()));
	const free = POSITION_COLOR_SWATCHES.find(
		(swatch) => !used.has(swatch.color.toLowerCase()),
	);
	return (
		free ??
		POSITION_COLOR_SWATCHES[usedColors.length % POSITION_COLOR_SWATCHES.length]!
	).color;
};
