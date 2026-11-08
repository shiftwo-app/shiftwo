import type { RealtimeTransport } from "../lib/realtime/types";
import type { ShiftScopeParams } from "../lib/shift-scope";
import type { Position, Shift, Staff } from "../types";
import { ShiftStatus } from "../types";
import ShiftBoard from "./ShiftBoard";
import Alert from "./ui/Alert";
import PageHeader from "./ui/PageHeader";

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
		preferenceConflicts: Record<string, string[]>;
		positionsEnabled: boolean;
	};
	scope: ShiftScopeParams;
	status: ShiftStatus;
}) => (
	<main className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
		<PageHeader
			title={title}
			description={`${board.canEdit ? "編集できます" : "閲覧だけできます"}・時間は ${board.timeUnitMinutes} 分きざみ${board.positionsEnabled ? "" : "・持ち場は使っていません"}`}
		/>
		{board.positionsEnabled && board.positions.length === 0 && (
			<Alert tone="info" className="mb-4">
				{scope.eventSlug
					? "このイベントの持ち場がまだありません。"
					: "日常シフトの持ち場がまだありません。"}
			</Alert>
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
			preferenceConflicts={board.preferenceConflicts}
			positionsEnabled={board.positionsEnabled}
		/>
	</main>
);

export default ShiftBoardPage;
export { ShiftStatus };
