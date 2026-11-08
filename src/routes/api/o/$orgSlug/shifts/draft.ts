import { createFileRoute } from "@tanstack/react-router";
import { withOrgApi } from "../../../../../server/org-access.server";
import { findShiftsWithRelations } from "../../../../../server/shifts.server";
import { ShiftStatus } from "../../../../../types";

type Ctx = { request: Request; params: { orgSlug: string } };

// 団体の下書きシフト
export const Route = createFileRoute("/api/o/$orgSlug/shifts/draft")({
	server: {
		handlers: {
			GET: withOrgApi<Ctx>("shift.view", async ({ membership }) =>
				Response.json(
					await findShiftsWithRelations(
						membership.organization.id,
						ShiftStatus.draft,
					),
				),
			),
		},
	},
});
