import { createFileRoute } from "@tanstack/react-router";
import { withOrgApi } from "../../../../../server/org-access.server";
import {
	deleteShiftResponse,
	writeShift,
} from "../../../../../server/shift-write.server";

type Ctx = { request: Request; params: { orgSlug: string; id: string } };

// シフトの更新（PUT）と削除（DELETE）。団体の中のシフトだけを扱い、権限は writeShift / deleteShiftResponse が見る
export const Route = createFileRoute("/api/o/$orgSlug/shifts/$id")({
	server: {
		handlers: {
			PUT: withOrgApi<Ctx>("shift.view", ({ request, params, membership }) =>
				writeShift(
					request,
					{
						organizationId: membership.organization.id,
						role: membership.member.role,
					},
					params.id,
				),
			),
			DELETE: withOrgApi<Ctx>("shift.view", ({ params, membership }) =>
				deleteShiftResponse(
					{
						organizationId: membership.organization.id,
						role: membership.member.role,
					},
					params.id,
				),
			),
		},
	},
});
