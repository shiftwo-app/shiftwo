import { createFileRoute } from "@tanstack/react-router";
import ShiftBoard from "../../../../components/ShiftBoard";
import { getShiftBoard } from "../../../../server/shifts.functions";
import { can } from "../../../../lib/org/permissions";
import { ShiftStatus } from "../../../../types";

export const Route = createFileRoute("/_authed/o/$orgSlug/draft")({
	loader: ({ params }) =>
		getShiftBoard({
			data: { orgSlug: params.orgSlug, status: ShiftStatus.draft },
		}),
	component: DraftPage,
});

function DraftPage() {
	const { shifts, roles, staffs, shiftSetting } = Route.useLoaderData();
	const { orgSlug } = Route.useParams();
	const { member } = Route.useRouteContext();

	return (
		<main className="space-y-4 p-4">
			<h1 className="text-xl font-bold">下書きシフト</h1>
			{!shiftSetting && (
				<p className="text-sm text-gray-600">時間粒度の設定がありません。</p>
			)}
			{shiftSetting && (
				<ShiftBoard
					shifts={shifts}
					roles={roles}
					staffs={staffs}
					timeUnitMinutes={shiftSetting.timeUnitMinutes}
					newShiftStatus={ShiftStatus.draft}
					orgSlug={orgSlug}
					canEdit={can(member.role, "shift.edit")}
				/>
			)}
		</main>
	);
}
