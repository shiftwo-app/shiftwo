import { useT } from "../lib/i18n/react";
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
}) => {
	const t = useT();
	const description = [
		t(board.canEdit ? "board.canEdit" : "board.viewOnly"),
		t("board.timeUnitDescription", { minutes: board.timeUnitMinutes }),
		...(board.positionsEnabled ? [] : [t("board.positionsDisabled")]),
	].join(t("board.descriptionSeparator"));
	return (
		<main className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
			<PageHeader title={title} description={description} />
			{board.positionsEnabled && board.positions.length === 0 && (
				<Alert tone="info" className="mb-4">
					{scope.eventSlug
						? t("board.noEventPositions")
						: t("board.noRegularPositions")}
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
};

export default ShiftBoardPage;
export { ShiftStatus };
