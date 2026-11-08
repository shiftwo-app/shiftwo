import type { RealtimeTransport } from "../lib/realtime/types";
import type { ShiftScopeParams } from "../lib/shift-scope";
import type { Position, Shift, Staff } from "../types";
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
		positions: Position[];
		staffs: Staff[];
		timeUnitMinutes: number;
		canEdit: boolean;
		liveTransport: RealtimeTransport;
	};
	scope: ShiftScopeParams;
	status: ShiftStatus;
}) => (
	<main className="space-y-4 p-4">
		<h1 className="text-xl font-bold">{title}</h1>
		{board.positions.length === 0 && (
			<p className="text-sm text-gray-600">
				{scope.eventSlug
					? "このイベントの持ち場がまだありません。"
					: "日常シフトの持ち場がまだありません。"}
			</p>
		)}
		<ShiftBoard
			shifts={board.shifts}
			positions={board.positions}
			staffs={board.staffs}
			timeUnitMinutes={board.timeUnitMinutes}
			newShiftStatus={status}
			scope={scope}
			canEdit={board.canEdit}
			liveTransport={board.liveTransport}
		/>
	</main>
);

export default ShiftBoardPage;
export { ShiftStatus };
