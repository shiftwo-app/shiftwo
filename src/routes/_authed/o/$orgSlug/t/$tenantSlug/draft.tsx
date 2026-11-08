import { createFileRoute } from "@tanstack/react-router";
import ShiftBoardPage from "../../../../../../components/ShiftBoardPage";
import { getShiftBoard } from "../../../../../../server/shifts.functions";
import { ShiftStatus } from "../../../../../../types";

// テナントの日常シフトの下書き
export const Route = createFileRoute("/_authed/o/$orgSlug/t/$tenantSlug/draft")(
	{
		loader: ({ params }) =>
			getShiftBoard({ data: { ...params, status: ShiftStatus.draft } }),
		component: () => {
			const board = Route.useLoaderData();
			const params = Route.useParams();
			return (
				<ShiftBoardPage
					title="日常シフトの下書き"
					board={board}
					scope={params}
					status={ShiftStatus.draft}
				/>
			);
		},
	},
);
