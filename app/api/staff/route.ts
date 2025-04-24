import { type NextRequest, NextResponse } from "next/server";
import { prisma } from "../../lib/prisma";

export async function GET(req: NextRequest) {
	try {
		const staffs = await prisma.staff.findMany({
			include: {
				preferredRoles: true,
			},
		});
		return NextResponse.json(staffs);
	} catch (error) {
		console.error(error);
		return NextResponse.json(
			{ message: "Error fetching staffs" },
			{ status: 500 },
		);
	}
}
