import { createFileRoute } from "@tanstack/react-router";
import { useT } from "../../../../../../lib/i18n/react";
import ShiftBoardPage from "../../../../../../components/ShiftBoardPage";
import { getShiftBoard } from "../../../../../../server/shifts.functions";
import { ShiftStatus } from "../../../../../../types";

// テナントの日常シフトの下書き
export const Route = createFileRoute("/_authed/o/$orgSlug/t/$tenantSlug/draft")(
	{
		loader: ({ params }) =>
			getShiftBoard({ data: { ...params, status: ShiftStatus.draft } }),
		component: () => {
			const t = useT();
			const board = Route.useLoaderData();
			const params = Route.useParams();
			return (
				<ShiftBoardPage
					title={t("board.titleRegularDraft")}
					board={board}
					scope={params}
					status={ShiftStatus.draft}
				/>
			);
		},
	},
);
