import { createFileRoute } from "@tanstack/react-router";
import { useT } from "../../../../../../../../lib/i18n/react";
import ShiftBoardPage from "../../../../../../../../components/ShiftBoardPage";
import { getShiftBoard } from "../../../../../../../../server/shifts.functions";
import { ShiftStatus } from "../../../../../../../../types";

// イベントのシフト（イベントの持ち場で組む）
export const Route = createFileRoute(
	"/_authed/o/$orgSlug/t/$tenantSlug/e/$eventSlug/",
)({
	loader: ({ params }) =>
		getShiftBoard({ data: { ...params, status: ShiftStatus.confirmed } }),
	component: () => {
		const t = useT();
		const board = Route.useLoaderData();
		const params = Route.useParams();
		return (
			<ShiftBoardPage
				title={t("board.titleEvent")}
				board={board}
				scope={params}
				status={ShiftStatus.confirmed}
			/>
		);
	},
});
