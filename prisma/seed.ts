import { PrismaPg } from "@prisma/adapter-pg";
import {
	PrismaClient,
	ShiftStatus,
} from "../src/generated/prisma-postgresql/client.ts";
import { loadEnvFileIfExists } from "../src/lib/load-env.ts";

loadEnvFileIfExists();

const prisma = new PrismaClient({
	adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

// 開発用のログインのアカウント（メールの確認コードでログインする。コードは dev サーバーのターミナルに出る）
const DEMO_OWNER_EMAIL = "leader@example.com";
const OTHER_OWNER_EMAIL = "other-owner@example.com";

/** 確認済みの開発用アカウントを作る（あれば使う）。はじめての設定も済ませた状態にする */
const upsertDemoUser = (email: string, name: string) =>
	prisma.user.upsert({
		where: { email },
		// すでにある（画面から登録した）アカウントも、確認済み・はじめての設定済みにそろえる
		update: { emailVerified: true, onboardedAt: new Date() },
		create: {
			id: crypto.randomUUID(),
			email,
			name,
			emailVerified: true,
			onboardedAt: new Date(),
		},
	});

async function main() {
	// 既存データのクリーンアップ（団体を消すと、団体のスタッフ・役割・イベント・シフト・設定・メンバー・招待コードも消える）
	await prisma.organization.deleteMany({});

	const owner = await upsertDemoUser(DEMO_OWNER_EMAIL, "リーダー");
	const otherOwner = await upsertDemoUser(
		OTHER_OWNER_EMAIL,
		"別団体のオーナー",
	);

	const org = await prisma.organization.create({
		data: {
			slug: "demo",
			name: "WordCamp 2024 運営",
			members: {
				create: { userId: owner.id, role: "owner", displayName: "リーダー" },
			},
		},
	});
	const organizationId = org.id;

	// 団体どうしのデータが混ざらないことを確かめるための、もう 1 つの団体（leader@example.com は所属しない）
	const otherOrg = await prisma.organization.create({
		data: {
			slug: "other",
			name: "別の団体",
			members: {
				create: {
					userId: otherOwner.id,
					role: "owner",
					displayName: "別団体のオーナー",
				},
			},
			shiftSetting: { create: { timeUnitMinutes: 15 } },
			roles: {
				create: {
					name: "別団体の役割",
					color: "#999999",
					requiredStaffCount: 1,
				},
			},
		},
	});

	await prisma.role.createMany({
		data: [
			{
				organizationId,
				name: "管理者",
				color: "#FF5733",
				requiredStaffCount: 1,
			},
			{
				organizationId,
				name: "司会進行",
				color: "#33FFF6",
				requiredStaffCount: 2,
			},
			{
				organizationId,
				name: "タイムキーパー",
				color: "#33FF57",
				requiredStaffCount: 3,
			},
			{
				organizationId,
				name: "チェッカー",
				color: "#3357FF",
				requiredStaffCount: 4,
			},
			{
				organizationId,
				name: "受付",
				color: "#3357FF",
				requiredStaffCount: 4,
			},
			{
				organizationId,
				name: "会場誘導",
				color: "#3357FF",
				requiredStaffCount: 4,
			},
			{
				organizationId,
				name: "配信・収録補助",
				color: "#3357FF",
				requiredStaffCount: 4,
			},
		],
	});

	const adminRole = await prisma.role.findFirst({
		where: { organizationId, name: "管理者" },
	});

	const receptionistRole = await prisma.role.findFirst({
		where: { organizationId, name: "受付" },
	});

	const moderatorRole = await prisma.role.findFirst({
		where: { organizationId, name: "司会進行" },
	});

	if (!adminRole || !receptionistRole || !moderatorRole) {
		throw new Error("管理者または受付、司会進行のロールが見つかりません");
	}

	const staff1 = await prisma.staff.create({
		data: {
			organizationId,
			name: "山田太郎",
			preferredRoles: {
				connect: [{ id: adminRole.id }, { id: receptionistRole.id }],
			},
			unavailableTimes: [
				{
					start: new Date("2024-06-01T09:00:00+09:00"),
					end: new Date("2024-06-01T12:00:00+09:00"),
				},
			],
		},
	});

	const staff2 = await prisma.staff.create({
		data: {
			organizationId,
			name: "佐藤花子",
			preferredRoles: {
				connect: [{ id: receptionistRole.id }],
			},
			unavailableTimes: [
				{
					start: new Date("2024-06-02T13:00:00+09:00"),
					end: new Date("2024-06-02T18:00:00+09:00"),
				},
			],
		},
	});

	const staff3 = await prisma.staff.create({
		data: {
			organizationId,
			name: "鈴木一郎",
			preferredRoles: {
				connect: [{ id: moderatorRole.id }],
			},
			unavailableTimes: [],
		},
	});

	const staff4 = await prisma.staff.create({
		data: {
			organizationId,
			name: "高橋真理",
			preferredRoles: {
				connect: [{ id: adminRole.id }, { id: moderatorRole.id }],
			},
			unavailableTimes: [
				{
					start: new Date("2024-06-03T10:00:00+09:00"),
					end: new Date("2024-06-03T15:00:00+09:00"),
				},
			],
		},
	});

	const event = await prisma.event.create({
		data: { organizationId, name: "WordCamp2024" },
	});

	await prisma.room.createMany({
		data: [
			{
				name: "メインホール",
				eventId: event.id,
				timeTable: [
					{
						start: new Date("2024-06-01T09:00:00+09:00"),
						end: new Date("2024-06-01T18:00:00+09:00"),
					},
					{
						start: new Date("2024-06-02T09:00:00+09:00"),
						end: new Date("2024-06-02T18:00:00+09:00"),
					},
				],
			},
			{
				name: "サブホール",
				eventId: event.id,
				timeTable: [
					{
						start: new Date("2024-06-01T10:00:00+09:00"),
						end: new Date("2024-06-01T17:00:00+09:00"),
					},
					{
						start: new Date("2024-06-02T10:00:00+09:00"),
						end: new Date("2024-06-02T17:00:00+09:00"),
					},
				],
			},
		],
	});

	await prisma.shift.createMany({
		data: [
			{
				organizationId,
				staffId: staff1.id,
				roleId: receptionistRole.id,
				timeRange: {
					start: new Date("2024-06-01T13:00:00+09:00"),
					end: new Date("2024-06-01T18:00:00+09:00"),
				},
				isPreferredRole: true,
				status: ShiftStatus.confirmed,
			},
			{
				organizationId,
				staffId: staff2.id,
				roleId: receptionistRole.id,
				timeRange: {
					start: new Date("2024-06-01T09:00:00+09:00"),
					end: new Date("2024-06-01T14:00:00+09:00"),
				},
				isPreferredRole: true,
				status: ShiftStatus.confirmed,
			},
			{
				organizationId,
				staffId: staff3.id,
				roleId: moderatorRole.id,
				timeRange: {
					start: new Date("2024-06-02T09:00:00+09:00"),
					end: new Date("2024-06-02T18:00:00+09:00"),
				},
				isPreferredRole: true,
				status: ShiftStatus.draft,
			},
			{
				organizationId,
				staffId: staff4.id,
				roleId: moderatorRole.id,
				timeRange: {
					start: new Date("2024-06-01T15:00:00+09:00"),
					end: new Date("2024-06-01T18:00:00+09:00"),
				},
				isPreferredRole: true,
				status: ShiftStatus.draft,
			},
		],
	});

	await prisma.shiftSetting.create({
		data: { organizationId, timeUnitMinutes: 30 },
	});

	console.log(
		`シードデータを作りました。${DEMO_OWNER_EMAIL} でログインすると「${org.name}」（/o/${org.slug}）のオーナーです（「${otherOrg.name}」には所属しません）`,
	);
}

main()
	.catch((e) => {
		console.error(e);
		process.exit(1);
	})
	.finally(async () => {
		await prisma.$disconnect();
	});
