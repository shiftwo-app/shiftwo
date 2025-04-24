// app/draft/page.tsx
"use client";
import type React from "react";
import { useState, useEffect } from "react";
import ShiftTimeline from "../components/ShiftTimeline";
import type { Shift, Role, Staff, ShiftSetting, ShiftStatus } from "../types";

const DraftPage: React.FC = () => {
	const [shifts, setShifts] = useState<Shift[]>([]);
	const [roles, setRoles] = useState<Role[]>([]);
	const [staffs, setStaffs] = useState<Staff[]>([]);
	const [shiftSetting, setShiftSetting] = useState<ShiftSetting | null>(null);

	useEffect(() => {
		const fetchData = async () => {
			const [shiftsData, rolesData, staffsData, shiftSettingData] =
				await Promise.all([
					fetch("/api/shifts/draft").then((res) => res.json()), // Fetch draft shifts
					fetch("/api/roles").then((res) => res.json()),
					fetch("/api/staff").then((res) => res.json()),
					fetch("/api/settings").then((res) => res.json()),
				]);
			setShifts(shiftsData);
			setRoles(rolesData);
			setStaffs(staffsData);
			setShiftSetting(shiftSettingData);
		};
		fetchData();
	}, []);

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
};

export default DraftPage;
