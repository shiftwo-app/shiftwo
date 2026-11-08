import { createFileRoute } from "@tanstack/react-router";
import { writeShift } from "../../../server/shift-write.server";
import { findShiftsWithRelations } from "../../../server/shifts.server";
import { ShiftStatus } from "../../../types";

export const Route = createFileRoute("/api/shifts/")({
	server: {
		handlers: {
			GET: async () => {
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
			},
			POST: ({ request }) => writeShift(request),
		},
	},
});
