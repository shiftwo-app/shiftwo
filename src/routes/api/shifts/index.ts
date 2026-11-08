import { createFileRoute } from "@tanstack/react-router";
import { withUser } from "../../../server/session.server";
import { writeShift } from "../../../server/shift-write.server";
import { findShiftsWithRelations } from "../../../server/shifts.server";
import { ShiftStatus } from "../../../types";

export const Route = createFileRoute("/api/shifts/")({
	server: {
		handlers: {
			GET: withUser(async () => {
				try {
					return Response.json(
						await findShiftsWithRelations(ShiftStatus.confirmed),
					);
				} catch (error) {
					console.error(error);
					return Response.json(
						{ message: "Error fetching confirmed shifts" },
						{ status: 500 },
					);
				}
			}),
			POST: withUser(({ request }) => writeShift(request)),
		},
	},
});
