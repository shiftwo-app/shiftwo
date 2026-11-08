/**
 * ⌘/Ctrl + ホイール（トラックパッドのピンチを含む）でのズーム（FR-1-3）。
 *
 * 出典：Love-Rox/kichijitsu の apps/web/src/layout/gridMetrics.ts（wheelDeltaToPx・accumulateWheelZoom・
 * zoomedScrollTop。MIT License）。kichijitsu は縦軸、shiftwo は横軸なので、zoomedScrollTop は
 * 向きを問わない形（zoomedScrollOffset）に直した。
 */

/**
 * 1 段ズームするのに必要な deltaY の量。トラックパッドのピンチは細かい delta が続けて届くので、
 * 溜めてこの量に達するごとに 1 段進める
 */
export const WHEEL_ZOOM_DELTA_PER_STEP = 24;

/** wheel の deltaMode（0 = pixel、1 = line、2 = page）を px 相当にそろえる */
export const wheelDeltaToPx = (deltaY: number, deltaMode: number): number => {
	if (deltaMode === 1) return deltaY * 16;
	if (deltaMode === 2) return deltaY * WHEEL_ZOOM_DELTA_PER_STEP;
	return deltaY;
};

export interface WheelZoomStep {
	/** 次の wheel イベントへ持ち越す量（px） */
	accumPx: number;
	/** 0 = まだしきい値未満、+1 = 縮小、-1 = 拡大 */
	direction: -1 | 0 | 1;
}

/**
 * ズーム量を溜める。1 イベントで進めるのは最大 1 段に丸め、進めたら余りは捨てる。
 * （kichijitsu では、マウスホイール 1 ノッチ（deltaY ≒ 100）で 4 段飛ぶ不具合があり、こう直した。
 * 余りを持ち越すと、逆向きに回したときに何ノッチも反応しなくなる）
 */
export const accumulateWheelZoom = (
	accumPx: number,
	deltaPx: number,
	thresholdPx: number = WHEEL_ZOOM_DELTA_PER_STEP,
): WheelZoomStep => {
	const next = accumPx + deltaPx;
	if (Math.abs(next) < thresholdPx) return { accumPx: next, direction: 0 };
	return { accumPx: 0, direction: next > 0 ? 1 : -1 };
};

/**
 * ズームしても、アンカー（ポインタの位置）に見えていた時刻が同じ位置に来るスクロール量。
 *
 * scroll はズームを当てる「前」の値を渡すこと。当てた後に読むと、縮小のときブラウザが新しい上限に
 * 切り詰めた値になり、位置が飛ぶ。
 *
 * @param scroll ズーム前のスクロール量（px）
 * @param anchorPx ビューポートの端からアンカーまでの距離（px）
 * @param fixedPx スクロールしても動かない見出しの幅（px）。時刻の軸はこの右から始まる
 * @param fromScale ズーム前の 1 単位あたりの px
 * @param toScale ズーム後の 1 単位あたりの px
 */
export const zoomedScrollOffset = (
	scroll: number,
	anchorPx: number,
	fixedPx: number,
	fromScale: number,
	toScale: number,
): number => {
	const anchorUnits = (scroll + anchorPx - fixedPx) / fromScale;
	return Math.max(0, anchorUnits * toScale + fixedPx - anchorPx);
};

/** ピンチで 1 段ズームする、指の間隔の変わり方（はじめの間隔に対する比） */
export const PINCH_ZOOM_RATIO = 1.25;

/**
 * ピンチ（2 本の指）の間隔の変わり方から、ズームを 1 段進めるかを決める（FR-3-3）。
 * 指を広げたら拡大（-1）、狭めたら縮小（+1）、まだ足りなければ 0
 */
export const pinchZoomDirection = (
	startDistance: number,
	currentDistance: number,
	ratio: number = PINCH_ZOOM_RATIO,
): -1 | 0 | 1 => {
	if (startDistance <= 0) return 0;
	const scale = currentDistance / startDistance;
	if (scale >= ratio) return -1;
	if (scale <= 1 / ratio) return 1;
	return 0;
};
