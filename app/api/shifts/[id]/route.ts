// app/api/shifts/[id]/route.ts
import { type NextRequest, NextResponse } from "next/server";
import { prisma } from "../../../lib/prisma";

export async function PUT(
	req: NextRequest,
	{ params }: { params: Promise<{ id: string }> },
) {
	try {
		const { id } = await params;
		const body = await req.json();
		const updatedShift = await prisma.shift.update({
			where: {
				id: id,
			},
			data: {
				staffId: body.staffId,
				roleId: body.roleId,
				timeRange: body.timeRange,
				isPreferredRole: body.isPreferredRole,
				status: body.status, // Add this line
			},
		});
		return NextResponse.json(updatedShift);
	} catch (error) {
		console.error(error);
		return NextResponse.json(
			{ message: "Error updating shift" },
			{ status: 500 },
		);
	}
}
