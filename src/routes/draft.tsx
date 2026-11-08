import { createFileRoute } from "@tanstack/react-router";
import ShiftTimeline from "../components/ShiftTimeline";
import { getShiftBoard } from "../server/shifts.functions";
import { ShiftStatus } from "../types";

export const Route = createFileRoute("/draft")({
	loader: () => getShiftBoard({ data: ShiftStatus.draft }),
	component: DraftPage,
});

function DraftPage() {
	const { shifts, roles, staffs, shiftSetting } = Route.useLoaderData();

	// TODO: Event・Room から表示する期間を決める（今は固定）
	const startTime = new Date(2024, 0, 1, 9, 0, 0);
	const endTime = new Date(2024, 0, 1, 22, 0, 0);

	return (
		<div>
			<h1>Draft Shifts</h1>
			{shiftSetting && (
				<ShiftTimeline
					shifts={shifts}
					roles={roles}
					staffs={staffs}
					timeUnitMinutes={shiftSetting.timeUnitMinutes}
					startTime={startTime}
					endTime={endTime}
				/>
			)}
		</div>
	);
}
