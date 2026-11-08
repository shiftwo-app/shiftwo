// 画面で使うセッションの形と、タイムラインの計算（layout.ts）に渡す形への変換
import type { Timed } from "../timeline/layout";

export type Session = {
	id: string;
	title: string;
	speaker: string;
	room: string;
	start: string;
	end: string;
	trackColor: string | null;
	tags: string[];
};

/** layout.ts の日・範囲の計算に渡す形 */
export const asTimed = <T extends Session>(session: T): T & Timed => ({
	...session,
	timeRange: { start: session.start, end: session.end },
});
