import { createFileRoute } from "@tanstack/react-router";
import { listShiftsHandler } from "../../../../../../../server/shift-api.server";
import { ShiftStatus } from "../../../../../../../types";

type Params = { orgSlug: string; tenantSlug: string };

// 日常シフトの下書き
export const Route = createFileRoute(
	"/api/o/$orgSlug/t/$tenantSlug/shifts/draft",
)({
	server: {
		handlers: {
			GET: listShiftsHandler<Params>(ShiftStatus.draft),
		},
	},
});
