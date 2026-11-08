// 開発用の初期データ。pnpm prisma:seed（prisma db seed）で入れる。団体ごと消してから作り直す
import { PrismaPg } from "@prisma/adapter-pg";
import {
	PrismaClient,
	ShiftStatus,
} from "../src/generated/prisma-postgresql/client.ts";
import { loadEnvFileIfExists } from "../src/lib/load-env.ts";
import { DEFAULT_ROLES } from "../src/lib/org/permissions.ts";

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

/** 団体を作るときに用意する最初のロール（src/server/org.server.ts の createOrganization と同じ） */
const defaultRoles = () => ({
	create: DEFAULT_ROLES.map((role, index) => ({
		name: role.name,
		color: role.color,
		permissions: [...role.permissions],
		sortOrder: index,
	})),
});

/** 日本時間の日時 */
const jst = (dateTime: string) => new Date(`${dateTime}:00+09:00`);
const range = (date: string, start: string, end: string) => ({
	start: jst(`${date}T${start}`),
	end: jst(`${date}T${end}`),
});

async function main() {
	// 既存データのクリーンアップ（団体を消すと、テナント・イベント・スタッフ・持ち場・シフト・メンバー・招待コードも消える）
	await prisma.organization.deleteMany({});

	const owner = await upsertDemoUser(DEMO_OWNER_EMAIL, "リーダー");
	const otherOwner = await upsertDemoUser(
		OTHER_OWNER_EMAIL,
		"別団体のオーナー",
	);

	// ---- 団体「デモ団体」：テナントが 2 つ（渋谷店・新宿店）。渋谷店にイベントが 1 つ ----
	const org = await prisma.organization.create({
		data: {
			slug: "demo",
			name: "デモ団体",
			roles: defaultRoles(),
			members: {
				create: { userId: owner.id, isOwner: true, displayName: "リーダー" },
			},
		},
	});
	const organizationId = org.id;

	const shibuya = await prisma.tenant.create({
		data: {
			organizationId,
			slug: "shibuya",
			name: "渋谷店",
			timeUnitMinutes: 30,
		},
	});
	const shinjuku = await prisma.tenant.create({
		data: {
			organizationId,
			slug: "shinjuku",
			name: "新宿店",
			timeUnitMinutes: 30,
		},
	});

	// スタッフは団体全体で共通（同じ人が複数のテナント・イベントに入れる）
	const staffOf = (
		name: string,
		unavailableTimes: { start: Date; end: Date }[],
	) =>
		prisma.staff.create({ data: { organizationId, name, unavailableTimes } });
	const yamada = await staffOf("山田太郎", [
		range("2024-06-01", "09:00", "12:00"),
	]);
	const sato = await staffOf("佐藤花子", [
		range("2024-06-02", "13:00", "18:00"),
	]);
	const suzuki = await staffOf("鈴木一郎", []);
	const takahashi = await staffOf("高橋真理", [
		range("2024-06-03", "10:00", "15:00"),
	]);

	// 日常シフトの持ち場（テナントごと）
	const dailyPosition = (
		tenantId: string,
		name: string,
		color: string,
		requiredStaffCount: number,
	) =>
		prisma.position.create({
			data: { organizationId, tenantId, name, color, requiredStaffCount },
		});
	const register = await dailyPosition(shibuya.id, "レジ", "#EDB27A", 2);
	const stocking = await dailyPosition(shibuya.id, "品出し", "#93C49A", 1);
	const shinjukuRegister = await dailyPosition(
		shinjuku.id,
		"レジ",
		"#EDB27A",
		1,
	);

	// 日常シフト（イベントに紐づかないシフト）
	const dailyShift = (
		tenantId: string,
		staffId: string,
		positionId: string,
		timeRange: { start: Date; end: Date },
		status: ShiftStatus,
	) => ({
		organizationId,
		tenantId,
		staffId,
		positionId,
		timeRange,
		isPreferredPosition: true,
		status,
	});
	await prisma.shift.createMany({
		data: [
			dailyShift(
				shibuya.id,
				yamada.id,
				register.id,
				range("2024-06-01", "10:00", "15:00"),
				ShiftStatus.confirmed,
			),
			dailyShift(
				shibuya.id,
				suzuki.id,
				stocking.id,
				range("2024-06-01", "09:00", "12:00"),
				ShiftStatus.confirmed,
			),
			dailyShift(
				shibuya.id,
				takahashi.id,
				register.id,
				range("2024-06-01", "14:00", "20:00"),
				ShiftStatus.draft,
			),
			dailyShift(
				shinjuku.id,
				sato.id,
				shinjukuRegister.id,
				range("2024-06-01", "11:00", "17:00"),
				ShiftStatus.confirmed,
			),
		],
	});

	// ---- イベント（単発運用）：渋谷店の「WordCamp 2024」。持ち場はイベントごとで、時間粒度は 15 分に上書き ----
	const event = await prisma.event.create({
		data: {
			organizationId,
			tenantId: shibuya.id,
			slug: "wordcamp-2024",
			name: "WordCamp 2024",
			timeUnitMinutes: 15,
		},
	});
	await prisma.room.createMany({
		data: [
			{
				name: "メインホール",
				eventId: event.id,
				timeTable: [
					range("2024-06-01", "09:00", "18:00"),
					range("2024-06-02", "09:00", "18:00"),
				],
			},
			{
				name: "サブホール",
				eventId: event.id,
				timeTable: [
					range("2024-06-01", "10:00", "17:00"),
					range("2024-06-02", "10:00", "17:00"),
				],
			},
		],
	});
	const eventPosition = (
		name: string,
		color: string,
		requiredStaffCount: number,
		staffingRules: {
			date: string | null;
			start: string;
			end: string;
			count: number;
		}[] = [],
	) =>
		prisma.position.create({
			data: {
				organizationId,
				tenantId: shibuya.id,
				eventId: event.id,
				name,
				color,
				requiredStaffCount,
				staffingRules,
			},
		});
	const admin = await eventPosition("管理者", "#EE9A8A", 1);
	const moderator = await eventPosition("司会進行", "#6FB3AE", 2);
	await eventPosition("タイムキーパー", "#93C49A", 3);
	await eventPosition("チェッカー", "#7FA7DE", 4);
	// 受付は、開場の前後（9-10 時）とお昼（12-13 時）に人を増やし、2 日目の朝は少なくてよい
	const reception = await eventPosition("受付", "#A99BE0", 2, [
		{ date: null, start: "09:00", end: "10:00", count: 4 },
		{ date: null, start: "12:00", end: "13:00", count: 3 },
		{ date: "2024-06-02", start: "09:00", end: "10:00", count: 2 },
	]);
	await prisma.staff.update({
		where: { id: yamada.id },
		data: {
			preferredPositions: { connect: [{ id: admin.id }, { id: reception.id }] },
		},
	});
	await prisma.staff.update({
		where: { id: sato.id },
		data: { preferredPositions: { connect: [{ id: reception.id }] } },
	});

	const eventShift = (
		staffId: string,
		positionId: string,
		timeRange: { start: Date; end: Date },
		status: ShiftStatus,
	) => ({
		organizationId,
		tenantId: shibuya.id,
		eventId: event.id,
		staffId,
		positionId,
		timeRange,
		isPreferredPosition: true,
		status,
	});
	await prisma.shift.createMany({
		data: [
			eventShift(
				yamada.id,
				reception.id,
				range("2024-06-01", "13:00", "18:00"),
				ShiftStatus.confirmed,
			),
			eventShift(
				sato.id,
				reception.id,
				range("2024-06-01", "09:00", "14:00"),
				ShiftStatus.confirmed,
			),
			eventShift(
				suzuki.id,
				moderator.id,
				range("2024-06-02", "09:00", "18:00"),
				ShiftStatus.draft,
			),
			eventShift(
				takahashi.id,
				moderator.id,
				range("2024-06-01", "15:00", "18:00"),
				ShiftStatus.draft,
			),
		],
	});

	// イベントのタイムテーブル（FR-6）
	const session = (
		title: string,
		speaker: string,
		room: string,
		timeRange: { start: Date; end: Date },
		trackColor: string | null,
		tags: string[],
	) => ({
		organizationId,
		eventId: event.id,
		title,
		speaker,
		room,
		startsAt: timeRange.start,
		endsAt: timeRange.end,
		trackColor,
		tags,
		importSource: "seed",
	});
	await prisma.eventSession.createMany({
		data: [
			session(
				"オープニング",
				"実行委員会",
				"メインホール",
				range("2024-06-01", "10:00", "10:20"),
				null,
				[],
			),
			session(
				"基調講演：これからの WordPress",
				"山田 太郎",
				"メインホール",
				range("2024-06-01", "10:30", "11:30"),
				"#6FB3AE",
				["keynote"],
			),
			session(
				"ブロックテーマ入門",
				"佐藤 花子",
				"サブホール",
				range("2024-06-01", "11:00", "11:45"),
				"#7FA7DE",
				["beginner"],
			),
			session(
				"ランチ",
				"—",
				"メインホール",
				range("2024-06-01", "12:00", "13:00"),
				"#A3ADB8",
				[],
			),
			session(
				"パフォーマンス改善の実例",
				"鈴木 一郎",
				"メインホール",
				range("2024-06-01", "13:00", "13:45"),
				null,
				["advanced"],
			),
			session(
				"コミュニティの育て方",
				"高橋 美咲",
				"サブホール",
				range("2024-06-01", "13:30", "14:15"),
				"#EDB27A",
				["community"],
			),
			session(
				"ライトニングトーク",
				"登壇者のみなさん",
				"メインホール",
				range("2024-06-01", "16:00", "17:00"),
				null,
				["lt"],
			),
			session(
				"コントリビューターデイ",
				"実行委員会",
				"メインホール",
				range("2024-06-02", "10:00", "16:00"),
				"#93C49A",
				["contributor"],
			),
		],
	});

	// ---- 団体どうしのデータが混ざらないことを確かめるための、もう 1 つの団体（leader@example.com は所属しない）。
	// テナントは 1 つなので、テナントを選ぶ手順は出ない ----
	const otherOrg = await prisma.organization.create({
		data: {
			slug: "other",
			name: "別の団体",
			roles: defaultRoles(),
			members: {
				create: {
					userId: otherOwner.id,
					isOwner: true,
					displayName: "別団体のオーナー",
				},
			},
			tenants: {
				create: { slug: "main", name: "別の団体", timeUnitMinutes: 15 },
			},
		},
		include: { tenants: true },
	});
	await prisma.position.create({
		data: {
			organizationId: otherOrg.id,
			tenantId: otherOrg.tenants[0].id,
			name: "別団体の持ち場",
			color: "#7FA7DE",
			requiredStaffCount: 1,
		},
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
