import ShiftTimeline from "@/app/components/ShiftTimeline";
import { prisma } from "@/app/lib/prisma";
import { Role, Shift, ShiftSetting, ShiftStatus, Staff } from "./types";

const HomePage = async () => {
	const shifts = ((await prisma.shift.findMany({
		where: {
			status: ShiftStatus.confirmed,
		},
	})) ?? []) as unknown as Shift[]; // timeRangeのJsonValueを上書き
	const roles: Role[] = await prisma.role.findMany();
	const staffs: Staff[] = await prisma.staff.findMany();
	const shiftSetting: ShiftSetting | null =
		await prisma.shiftSetting.findFirst();

	const startTime = new Date(2024, 0, 1, 9, 0, 0);
	const endTime = new Date(2024, 0, 1, 22, 0, 0);

	return (
		<div>
			<h1>Shift Management</h1>
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
};

export default HomePage;
