// app/api/shifts/route.ts
import { type NextRequest, NextResponse } from "next/server";
import { prisma } from "../../lib/prisma";
import { ShiftStatus } from "../../types";

export async function GET(req: NextRequest) {
	try {
		const confirmedShifts = await prisma.shift.findMany({
			where: {
				status: ShiftStatus.confirmed,
			},
			include: {
				staff: true,
				role: true,
			},
		});
		return NextResponse.json(confirmedShifts);
	} catch (error) {
		console.error(error);
		return NextResponse.json(
			{ message: "Error fetching confirmed shifts" },
			{ status: 500 },
		);
	}
}

export async function POST(req: NextRequest) {
	try {
		const body = await req.json();
		const newShift = await prisma.shift.create({
			data: {
				staffId: body.staffId,
				roleId: body.roleId,
				timeRange: body.timeRange,
				isPreferredRole: body.isPreferredRole,
				status: body.status, // Add this line
			},
		});
		return NextResponse.json(newShift, { status: 201 });
	} catch (error) {
		console.error(error);
		return NextResponse.json(
			{ message: "Error creating shift" },
			{ status: 500 },
		);
	}
}
// ... (PUT, DELETE routes - see below)
