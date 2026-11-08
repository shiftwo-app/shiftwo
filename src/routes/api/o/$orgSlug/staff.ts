import { createFileRoute } from "@tanstack/react-router";
import { withOrgApi } from "../../../../server/org-access.server";
import { findStaffsWithPreferredRoles } from "../../../../server/shifts.server";

type Ctx = { request: Request; params: { orgSlug: string } };

// 団体のスタッフ一覧（メンバーなら見られる）
export const Route = createFileRoute("/api/o/$orgSlug/staff")({
	server: {
		handlers: {
			GET: withOrgApi<Ctx>("shift.view", async ({ membership }) =>
				Response.json(
					await findStaffsWithPreferredRoles(membership.organization.id),
				),
			),
		},
	},
});
