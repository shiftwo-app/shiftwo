import { createFileRoute } from "@tanstack/react-router";
import { prisma } from "../../../lib/prisma.server";
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
			POST: async ({ request }) => {
				try {
					// TODO: 入力の検証がない（Next 版から引き継いだまま）
					const body = await request.json();
					const newShift = await prisma.shift.create({
						data: {
							staffId: body.staffId,
							roleId: body.roleId,
							timeRange: body.timeRange,
							isPreferredRole: body.isPreferredRole,
							status: body.status,
						},
					});
					return Response.json(newShift, { status: 201 });
				} catch (error) {
					console.error(error);
					return Response.json(
						{ message: "Error creating shift" },
						{ status: 500 },
					);
				}
			},
		},
	},
});
