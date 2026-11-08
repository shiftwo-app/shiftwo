import { createFileRoute } from "@tanstack/react-router";
import { withUser } from "../../../server/session.server";
import { findShiftsWithRelations } from "../../../server/shifts.server";
import { ShiftStatus } from "../../../types";

export const Route = createFileRoute("/api/shifts/draft")({
	server: {
		handlers: {
			GET: withUser(async () => {
				try {
					return Response.json(
						await findShiftsWithRelations(ShiftStatus.draft),
					);
				} catch (error) {
					console.error(error);
					return Response.json(
						{ message: "Error fetching draft shifts" },
						{ status: 500 },
					);
				}
			}),
		},
	},
});
