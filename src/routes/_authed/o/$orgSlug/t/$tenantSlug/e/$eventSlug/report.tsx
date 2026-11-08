import { createFileRoute } from "@tanstack/react-router";
import ReportPage from "../../../../../../../../components/report/ReportPage";
import { useT } from "../../../../../../../../lib/i18n/react";
import { hasPermission } from "../../../../../../../../lib/org/permissions";
import { getShiftBoard } from "../../../../../../../../server/shifts.functions";
import { ShiftStatus } from "../../../../../../../../types";

// シフトの確認とレポート（FR-7）。?status=draft で下書きも見られる
export const Route = createFileRoute(
	"/_authed/o/$orgSlug/t/$tenantSlug/e/$eventSlug/report",
)({
	validateSearch: (search: Record<string, unknown>): { status?: "draft" } =>
		search.status === "draft" ? { status: "draft" } : {},
	loaderDeps: ({ search }) => ({ status: search.status }),
	loader: ({ params, deps }) =>
		getShiftBoard({
			data: {
				...params,
				status:
					deps.status === "draft" ? ShiftStatus.draft : ShiftStatus.confirmed,
			},
		}),
	component: () => {
		const t = useT();
		const board = Route.useLoaderData();
		const params = Route.useParams();
		const { status } = Route.useSearch();
		const { member } = Route.useRouteContext();
		return (
			<ReportPage
				title={t("report.titleEvent")}
				board={board}
				scope={params}
				status={status === "draft" ? ShiftStatus.draft : ShiftStatus.confirmed}
				canSetBreakGap={hasPermission(member.permissions, "tenant.manage")}
			/>
		);
	},
});
