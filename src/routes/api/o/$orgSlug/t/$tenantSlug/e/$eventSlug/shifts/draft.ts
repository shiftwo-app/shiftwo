import { createFileRoute } from "@tanstack/react-router";
import { listShiftsHandler } from "../../../../../../../../../server/shift-api.server";
import { ShiftStatus } from "../../../../../../../../../types";

type Params = { orgSlug: string; tenantSlug: string; eventSlug: string };

// イベントの下書き
export const Route = createFileRoute(
	"/api/o/$orgSlug/t/$tenantSlug/e/$eventSlug/shifts/draft",
)({
	server: {
		handlers: {
			GET: listShiftsHandler<Params>(ShiftStatus.draft),
		},
	},
});
