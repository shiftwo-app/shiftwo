// 持ち場を使うかどうか。団体の設定を基本にして、テナント・イベントで上書きできる
// （イベント → テナント → 団体 の順に、決まっているものを使う）。
// 使わない単位では、シフトは人と時間だけで組み、持ち場の選択・持ち場別の表示・必要人数・希望の持ち場を出さない

export const resolvePositionsEnabled = (settings: {
	organization: boolean;
	tenant: boolean | null;
	event?: boolean | null;
}): boolean => settings.event ?? settings.tenant ?? settings.organization;

/** 上書きの設定の値（画面の選択肢）。inherit は「上の単位と同じ」 */
export type PositionsSetting = "inherit" | "on" | "off";

export const toPositionsSetting = (value: boolean | null): PositionsSetting =>
	value === null ? "inherit" : value ? "on" : "off";

export const fromPositionsSetting = (
	setting: PositionsSetting,
): boolean | null => (setting === "inherit" ? null : setting === "on");
