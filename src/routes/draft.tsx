import { createFileRoute } from "@tanstack/react-router";
import ShiftBoard from "../components/ShiftBoard";
import { getShiftBoard } from "../server/shifts.functions";
import { ShiftStatus } from "../types";

export const Route = createFileRoute("/draft")({
	loader: () => getShiftBoard({ data: ShiftStatus.draft }),
	component: DraftPage,
});

function DraftPage() {
	const { shifts, roles, staffs, shiftSetting } = Route.useLoaderData();

	return (
		<main className="space-y-4 p-4">
			<h1 className="text-xl font-bold">Draft Shifts</h1>
			{shiftSetting && (
				<ShiftBoard
					shifts={shifts}
					roles={roles}
					staffs={staffs}
					timeUnitMinutes={shiftSetting.timeUnitMinutes}
					newShiftStatus={ShiftStatus.draft}
				/>
			)}
		</main>
	);
}
