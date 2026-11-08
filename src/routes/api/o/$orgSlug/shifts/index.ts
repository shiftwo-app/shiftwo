import { createFileRoute } from "@tanstack/react-router";
import { withOrgApi } from "../../../../../server/org-access.server";
import { writeShift } from "../../../../../server/shift-write.server";
import { findShiftsWithRelations } from "../../../../../server/shifts.server";
import { ShiftStatus } from "../../../../../types";

type Ctx = { request: Request; params: { orgSlug: string } };

// 団体の確定シフト（GET）と、シフトの作成（POST。権限は writeShift が見る）
export const Route = createFileRoute("/api/o/$orgSlug/shifts/")({
	server: {
		handlers: {
			GET: withOrgApi<Ctx>("shift.view", async ({ membership }) =>
				Response.json(
					await findShiftsWithRelations(
						membership.organization.id,
						ShiftStatus.confirmed,
					),
				),
			),
			POST: withOrgApi<Ctx>("shift.view", ({ request, membership }) =>
				writeShift(request, {
					organizationId: membership.organization.id,
					role: membership.member.role,
				}),
			),
		},
	},
});
