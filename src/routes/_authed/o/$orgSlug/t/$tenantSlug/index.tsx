import { createFileRoute } from "@tanstack/react-router";
import { useT } from "../../../../../../lib/i18n/react";
import ShiftBoardPage from "../../../../../../components/ShiftBoardPage";
import { getShiftBoard } from "../../../../../../server/shifts.functions";
import { ShiftStatus } from "../../../../../../types";

// テナントの日常シフト（イベントに紐づかないシフト）の確定版
export const Route = createFileRoute("/_authed/o/$orgSlug/t/$tenantSlug/")({
	loader: ({ params }) =>
		getShiftBoard({ data: { ...params, status: ShiftStatus.confirmed } }),
	component: () => {
		const t = useT();
		const board = Route.useLoaderData();
		const params = Route.useParams();
		return (
			<ShiftBoardPage
				title={t("board.titleRegular")}
				board={board}
				scope={params}
				status={ShiftStatus.confirmed}
			/>
		);
	},
});
