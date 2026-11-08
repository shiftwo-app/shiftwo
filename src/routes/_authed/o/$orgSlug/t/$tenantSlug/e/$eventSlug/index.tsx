import { createFileRoute } from "@tanstack/react-router";
import ShiftBoardPage from "../../../../../../../../components/ShiftBoardPage";
import { getShiftBoard } from "../../../../../../../../server/shifts.functions";
import { ShiftStatus } from "../../../../../../../../types";

// イベントのシフト（イベントの役割で組む）
export const Route = createFileRoute(
	"/_authed/o/$orgSlug/t/$tenantSlug/e/$eventSlug/",
)({
	loader: ({ params }) =>
		getShiftBoard({ data: { ...params, status: ShiftStatus.confirmed } }),
	component: () => {
		const board = Route.useLoaderData();
		const params = Route.useParams();
		return (
			<ShiftBoardPage
				title="イベントの確定シフト"
				board={board}
				scope={params}
				status={ShiftStatus.confirmed}
			/>
		);
	},
});
