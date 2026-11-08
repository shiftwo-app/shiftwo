import { createFileRoute } from "@tanstack/react-router";
import {
	createShiftHandler,
	listShiftsHandler,
} from "../../../../../../../../../server/shift-api.server";
import { ShiftStatus } from "../../../../../../../../../types";

type Params = { orgSlug: string; tenantSlug: string; eventSlug: string };

// イベントの確定シフト（GET）と、シフトの作成（POST）
export const Route = createFileRoute(
	"/api/o/$orgSlug/t/$tenantSlug/e/$eventSlug/shifts/",
)({
	server: {
		handlers: {
			GET: listShiftsHandler<Params>(ShiftStatus.confirmed),
			POST: createShiftHandler<Params>(),
		},
	},
});
