import type { ShiftScopeParams } from "../lib/shift-scope";
import type { Role, Shift, Staff } from "../types";
import { ShiftStatus } from "../types";
import ShiftBoard from "./ShiftBoard";

/** シフトの画面（日常シフトとイベントで共通）。データは各ルートの loader が用意する */
const ShiftBoardPage = ({
	title,
	board,
	scope,
	status,
}: {
	title: string;
	board: {
		shifts: Shift[];
		roles: Role[];
		staffs: Staff[];
		timeUnitMinutes: number;
		canEdit: boolean;
	};
	scope: ShiftScopeParams;
	status: ShiftStatus;
}) => (
	<main className="space-y-4 p-4">
		<h1 className="text-xl font-bold">{title}</h1>
		{board.roles.length === 0 && (
			<p className="text-sm text-gray-600">
				{scope.eventSlug
					? "このイベントの役割がまだありません。"
					: "日常シフトの役割がまだありません。"}
			</p>
		)}
		<ShiftBoard
			shifts={board.shifts}
			roles={board.roles}
			staffs={board.staffs}
			timeUnitMinutes={board.timeUnitMinutes}
			newShiftStatus={status}
			scope={scope}
			canEdit={board.canEdit}
		/>
	</main>
);

export default ShiftBoardPage;
export { ShiftStatus };
