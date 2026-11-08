import type {
	Staff as PrismaStaff,
	Position as PrismaPosition,
	Shift as PrismaShift,
	Tenant as PrismaTenant,
	Event as PrismaEvent,
	Room as PrismaRoom,
} from "../generated/prisma-postgresql/client";

export type Staff = PrismaStaff;
/** 持ち場（受付・レジなど）。権限のロールとは別 */
export type Position = PrismaPosition;
export type Shift = Omit<PrismaShift, "timeRange"> & {
	timeRange: TimeRange;
};
export enum ShiftStatus {
	draft = "draft",
	confirmed = "confirmed",
}
export type Tenant = PrismaTenant;
export type Event = PrismaEvent;
export type Room = PrismaRoom;

export interface TimeRange {
	start: Date;
	end: Date;
}
