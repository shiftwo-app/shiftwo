import { PrismaClient, ShiftStatus } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
	// 既存データのクリーンアップ
	await prisma.shift.deleteMany({});
	await prisma.staff.deleteMany({});
	await prisma.role.deleteMany({});
	await prisma.room.deleteMany({});
	await prisma.event.deleteMany({});
	await prisma.shiftSetting.deleteMany({});

	await prisma.role.createMany({
		data: [
			{
				name: "管理者",
				color: "#FF5733",
				requiredStaffCount: 1,
			},
			{
				name: "司会進行",
				color: "#33FFF6",
				requiredStaffCount: 2,
			},
			{
				name: "タイムキーパー",
				color: "#33FF57",
				requiredStaffCount: 3,
			},
			{
				name: "チェッカー",
				color: "#3357FF",
				requiredStaffCount: 4,
			},
			{
				name: "受付",
				color: "#3357FF",
				requiredStaffCount: 4,
			},
			{
				name: "会場誘導",
				color: "#3357FF",
				requiredStaffCount: 4,
			},
			{
				name: "配信・収録補助",
				color: "#3357FF",
				requiredStaffCount: 4,
			},
		],
	});

	const adminRole = await prisma.role.findFirst({
		where: { name: "管理者" },
	});

	const receptionistRole = await prisma.role.findFirst({
		where: { name: "受付" },
	});

	const moderatorRole = await prisma.role.findFirst({
		where: { name: "司会進行" },
	});

	if (!adminRole || !receptionistRole || !moderatorRole) {
		throw new Error("管理者または受付、司会進行のロールが見つかりません");
	}

	const staff1 = await prisma.staff.create({
		data: {
			name: "山田太郎",
			preferredRoles: {
				connect: [{ id: adminRole.id }, { id: receptionistRole.id }],
			},
			unavailableTimes: [
				{
					start: new Date("2024-06-01T09:00:00Z"),
					end: new Date("2024-06-01T12:00:00Z"),
				},
			],
		},
	});

	const staff2 = await prisma.staff.create({
		data: {
			name: "佐藤花子",
			preferredRoles: {
				connect: [{ id: receptionistRole.id }],
			},
			unavailableTimes: [
				{
					start: new Date("2024-06-02T13:00:00Z"),
					end: new Date("2024-06-02T18:00:00Z"),
				},
			],
		},
	});

	const staff3 = await prisma.staff.create({
		data: {
			name: "鈴木一郎",
			preferredRoles: {
				connect: [{ id: moderatorRole.id }],
			},
			unavailableTimes: [],
		},
	});

	const staff4 = await prisma.staff.create({
		data: {
			name: "高橋真理",
			preferredRoles: {
				connect: [{ id: adminRole.id }, { id: moderatorRole.id }],
			},
			unavailableTimes: [
				{
					start: new Date("2024-06-03T10:00:00Z"),
					end: new Date("2024-06-03T15:00:00Z"),
				},
			],
		},
	});

	const event = await prisma.event.create({
		data: { name: "WordCamp2024" },
	});

	await prisma.room.createMany({
		data: [
			{
				name: "メインホール",
				eventId: event.id,
				timeTable: [
					{
						start: new Date("2024-06-01T09:00:00Z"),
						end: new Date("2024-06-01T18:00:00Z"),
					},
					{
						start: new Date("2024-06-02T09:00:00Z"),
						end: new Date("2024-06-02T18:00:00Z"),
					},
				],
			},
			{
				name: "サブホール",
				eventId: event.id,
				timeTable: [
					{
						start: new Date("2024-06-01T10:00:00Z"),
						end: new Date("2024-06-01T17:00:00Z"),
					},
					{
						start: new Date("2024-06-02T10:00:00Z"),
						end: new Date("2024-06-02T17:00:00Z"),
					},
				],
			},
		],
	});

	await prisma.shift.createMany({
		data: [
			{
				staffId: staff1.id,
				roleId: receptionistRole.id,
				timeRange: {
					start: new Date("2024-06-01T13:00:00Z"),
					end: new Date("2024-06-01T18:00:00Z"),
				},
				isPreferredRole: true,
				status: ShiftStatus.confirmed,
			},
			{
				staffId: staff2.id,
				roleId: receptionistRole.id,
				timeRange: {
					start: new Date("2024-06-01T09:00:00Z"),
					end: new Date("2024-06-01T14:00:00Z"),
				},
				isPreferredRole: true,
				status: ShiftStatus.confirmed,
			},
			{
				staffId: staff3.id,
				roleId: moderatorRole.id,
				timeRange: {
					start: new Date("2024-06-02T09:00:00Z"),
					end: new Date("2024-06-02T18:00:00Z"),
				},
				isPreferredRole: true,
				status: ShiftStatus.draft,
			},
			{
				staffId: staff4.id,
				roleId: moderatorRole.id,
				timeRange: {
					start: new Date("2024-06-01T15:00:00Z"),
					end: new Date("2024-06-01T18:00:00Z"),
				},
				isPreferredRole: true,
				status: ShiftStatus.draft,
			},
		],
	});

	await prisma.shiftSetting.create({
		data: { timeUnitMinutes: 30 },
	});

	console.log("シードデータが正常に作成されました！");
}

main()
	.catch((e) => {
		console.error(e);
		process.exit(1);
	})
	.finally(async () => {
		await prisma.$disconnect();
	});
