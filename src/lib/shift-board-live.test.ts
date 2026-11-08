import { describe, expect, it } from "vite-plus/test";
import {
	parseShiftBoardEvent,
	shiftBoardChannel,
	shiftBoardLivePath,
} from "./shift-board-live";

describe("シフトの画面のリアルタイムの更新", () => {
	it("チャンネルは団体・テナント・イベントで分かれ、日常シフトは daily", () => {
		expect(
			shiftBoardChannel({ organizationId: "o", tenantId: "t", eventId: null }),
		).toBe("o:t:daily");
		expect(
			shiftBoardChannel({ organizationId: "o", tenantId: "t", eventId: "e" }),
		).toBe("o:t:e");
	});

	it("つなぐ URL", () => {
		expect(shiftBoardLivePath({ orgSlug: "a", tenantSlug: "b" })).toBe(
			"/api/o/a/t/b/live",
		);
		expect(
			shiftBoardLivePath({ orgSlug: "a", tenantSlug: "b", eventSlug: "c" }),
		).toBe("/api/o/a/t/b/e/c/live");
	});

	it("知らない形のメッセージは無視する", () => {
		expect(
			parseShiftBoardEvent(
				'{"type":"shift.changed","shiftId":"x","version":2}',
			),
		).toEqual({ type: "shift.changed", shiftId: "x", version: 2 });
		for (const data of ["pong", "{}", '{"type":"other"}', 1, null]) {
			expect(parseShiftBoardEvent(data)).toBeNull();
		}
	});
});
