// app/api/shifts/draft/route.ts
import { type NextRequest, NextResponse } from "next/server";
import { prisma } from "../../../lib/prisma";
import { ShiftStatus } from "../../../types";

export async function GET(req: NextRequest) {
	try {
		const draftShifts = await prisma.shift.findMany({
			where: {
				status: ShiftStatus.draft,
			},
			include: {
				staff: true,
				role: true,
			},
		});
		return NextResponse.json(draftShifts);
	} catch (error) {
		console.error(error);
		return NextResponse.json(
			{ message: "Error fetching draft shifts" },
			{ status: 500 },
		);
	}
}
