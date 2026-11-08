import { createFileRoute } from "@tanstack/react-router";
import ShiftBoardPage from "../../../../../../components/ShiftBoardPage";
import { getShiftBoard } from "../../../../../../server/shifts.functions";
import { ShiftStatus } from "../../../../../../types";

// テナントの日常シフト（イベントに紐づかないシフト）の確定版
export const Route = createFileRoute("/_authed/o/$orgSlug/t/$tenantSlug/")({
	loader: ({ params }) =>
		getShiftBoard({ data: { ...params, status: ShiftStatus.confirmed } }),
	component: () => {
		const board = Route.useLoaderData();
		const params = Route.useParams();
		return (
			<ShiftBoardPage
				title="日常シフト"
				board={board}
				scope={params}
				status={ShiftStatus.confirmed}
			/>
		);
	},
});
