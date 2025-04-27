import type { Shift, Role, Staff, ShiftSetting } from "../types";

const BASE_URL = "/api";

export const fetchShifts = async (): Promise<Shift[]> => {
	const res = await fetch(`${BASE_URL}/shifts`);
	const data = await res.json();
	return data;
};

export const fetchRoles = async (): Promise<Role[]> => {
	const res = await fetch(`${BASE_URL}/roles`);
	const data = await res.json();
	return data;
};

export const fetchStaffs = async (): Promise<Staff[]> => {
	const res = await fetch(`${BASE_URL}/staff`);
	const data = await res.json();
	return data;
};

export const fetchShiftSetting = async (): Promise<ShiftSetting> => {
	const res = await fetch(`${BASE_URL}/settings`);
	const data = await res.json();
	return data;
};

// 他のAPI関数も同様に実装
