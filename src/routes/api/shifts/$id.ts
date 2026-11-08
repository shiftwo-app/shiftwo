import { createFileRoute } from "@tanstack/react-router";
import { prisma } from "../../../lib/prisma.server";

export const Route = createFileRoute("/api/shifts/$id")({
	server: {
		handlers: {
			PUT: async ({ request, params }) => {
				try {
					// TODO: 入力の検証がない（Next 版から引き継いだまま）
					const body = await request.json();
					const updatedShift = await prisma.shift.update({
						where: { id: params.id },
						data: {
							staffId: body.staffId,
							roleId: body.roleId,
							timeRange: body.timeRange,
							isPreferredRole: body.isPreferredRole,
							status: body.status,
						},
					});
					return Response.json(updatedShift);
				} catch (error) {
					console.error(error);
					return Response.json(
						{ message: "Error updating shift" },
						{ status: 500 },
					);
				}
			},
		},
	},
});
