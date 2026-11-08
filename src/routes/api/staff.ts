import { createFileRoute } from "@tanstack/react-router";
import { prisma } from "../../lib/prisma.server";

export const Route = createFileRoute("/api/staff")({
	server: {
		handlers: {
			GET: async () => {
				try {
					const staffs = await prisma.staff.findMany({
						include: { preferredRoles: true },
					});
					return Response.json(staffs);
				} catch (error) {
					console.error(error);
					return Response.json(
						{ message: "Error fetching staffs" },
						{ status: 500 },
					);
				}
			},
		},
	},
});
