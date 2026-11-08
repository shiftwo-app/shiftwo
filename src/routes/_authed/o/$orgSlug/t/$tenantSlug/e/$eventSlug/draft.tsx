import { createFileRoute } from "@tanstack/react-router";
import ShiftBoardPage from "../../../../../../../../components/ShiftBoardPage";
import { getShiftBoard } from "../../../../../../../../server/shifts.functions";
import { ShiftStatus } from "../../../../../../../../types";

// イベントのシフト（イベントの役割で組む）
export const Route = createFileRoute(
	"/_authed/o/$orgSlug/t/$tenantSlug/e/$eventSlug/draft",
)({
	loader: ({ params }) =>
		getShiftBoard({ data: { ...params, status: ShiftStatus.draft } }),
	component: () => {
		const board = Route.useLoaderData();
		const params = Route.useParams();
		return (
			<ShiftBoardPage
				title="イベントの下書き"
				board={board}
				scope={params}
				status={ShiftStatus.draft}
			/>
		);
	},
});
