// 権限（Discord のようなロール）。ロールごとに権限の項目を設定し、1 人が複数のロールを持てる。権限は足し合わせ。
// サーバーの権限チェックと、画面の出し分けの両方で使う（画面で隠すのは見た目のためで、守りはサーバーのチェック）

import type { MessageKey } from "../i18n/messages";
import { type Translate, translatorFor } from "../i18n/translate";

// 画面に出す名前はメッセージのキー（labelKey）で持ち、画面の言語で引く
export const PERMISSIONS = [
	{ key: "shift.view", labelKey: "settings.permShiftView", scoped: true },
	{ key: "shift.edit", labelKey: "settings.permShiftEdit", scoped: true },
	{ key: "shift.confirm", labelKey: "settings.permShiftConfirm", scoped: true },
	{
		key: "position.manage",
		labelKey: "settings.permPositionManage",
		scoped: true,
	},
	{ key: "event.manage", labelKey: "settings.permEventManage", scoped: true },
	{ key: "staff.manage", labelKey: "settings.permStaffManage", scoped: false },
	{ key: "member.view", labelKey: "settings.permMemberView", scoped: false },
	{
		key: "invite.manage",
		labelKey: "settings.permInviteManage",
		scoped: false,
	},
	{ key: "invite.guest", labelKey: "settings.permInviteGuest", scoped: false },
	{
		key: "member.manage",
		labelKey: "settings.permMemberManage",
		scoped: false,
	},
	{ key: "role.manage", labelKey: "settings.permRoleManage", scoped: false },
	{
		key: "tenant.manage",
		labelKey: "settings.permTenantManage",
		scoped: false,
	},
	{ key: "org.settings", labelKey: "settings.permOrgSettings", scoped: false },
	{ key: "guild.bypass", labelKey: "settings.permGuildBypass", scoped: false },
] as const satisfies readonly {
	key: string;
	labelKey: MessageKey;
	scoped: boolean;
}[];

export type Permission = (typeof PERMISSIONS)[number]["key"];

export const ALL_PERMISSIONS: readonly Permission[] = PERMISSIONS.map(
	(p) => p.key,
);

/**
 * テナント・イベントで割り当てたロールから上乗せされる権限（シフトに関わるものだけ）。
 * それ以外（メンバーの管理など）は団体全体の操作なので、団体で持つロールだけで決める
 */
export const SCOPED_PERMISSIONS: readonly Permission[] = PERMISSIONS.filter(
	(p) => p.scoped,
).map((p) => p.key);

/** 権限の名前（画面の言語で）。t を渡さなければ日本語 */
export const permissionLabel = (
	permission: Permission,
	t: Translate = translatorFor("ja"),
): string => {
	const entry = PERMISSIONS.find((p) => p.key === permission);
	return entry ? t(entry.labelKey) : permission;
};

/** 権限の名前（日本語）。画面では permissionLabel(p, t) を使う */
export const PERMISSION_LABELS = Object.fromEntries(
	PERMISSIONS.map((p) => [p.key, permissionLabel(p.key)]),
) as Record<Permission, string>;

const isPermission = (value: unknown): value is Permission =>
	typeof value === "string" &&
	(ALL_PERMISSIONS as readonly string[]).includes(value);

/** DB の Json（権限の配列）を読む。知らない項目は捨てる */
export const parsePermissions = (value: unknown): Permission[] =>
	Array.isArray(value) ? [...new Set(value.filter(isPermission))] : [];

/** 持っているロールの権限を足し合わせる。オーナーは全権限 */
export const permissionsOf = (
	isOwner: boolean,
	roles: readonly { permissions: unknown }[],
): Permission[] => {
	if (isOwner) return [...ALL_PERMISSIONS];
	const set = new Set<Permission>();
	for (const role of roles)
		for (const p of parsePermissions(role.permissions)) set.add(p);
	return ALL_PERMISSIONS.filter((p) => set.has(p));
};

/**
 * テナント・イベントでの権限：団体での権限に、テナント・イベントで割り当てたロールの
 * シフトに関わる権限（SCOPED_PERMISSIONS）を上乗せする。減らすことはできない
 */
export const scopedPermissions = (
	orgPermissions: readonly Permission[],
	...scopeRoleSets: readonly (readonly { permissions: unknown }[])[]
): Permission[] => {
	const set = new Set<Permission>(orgPermissions);
	for (const roles of scopeRoleSets) {
		for (const role of roles) {
			for (const p of parsePermissions(role.permissions)) {
				if (SCOPED_PERMISSIONS.includes(p)) set.add(p);
			}
		}
	}
	return ALL_PERMISSIONS.filter((p) => set.has(p));
};

export const hasPermission = (
	permissions: readonly Permission[],
	permission: Permission,
): boolean => permissions.includes(permission);

/**
 * 権限の乗っ取りを防ぐ：自分が持っている権限の範囲でしか、ロールに付けたり人に渡したりできない。
 * target のすべてを actor が持っていれば true
 */
export const canGrant = (
	actorPermissions: readonly Permission[],
	targetPermissions: readonly Permission[],
): boolean => targetPermissions.every((p) => actorPermissions.includes(p));

/**
 * 招待コードで、そのロールを渡せるか。基本は canGrant（自分が持っている権限の範囲だけ）。
 * 例外として「ゲストを招待する」（invite.guest）を持つ人は、自分になくても
 * 「Discord サーバーの参加条件の免除」（guild.bypass）を含むロールを渡せる。それ以外の権限の例外はない
 */
export const canInviteWith = (
	actorPermissions: readonly Permission[],
	rolePermissions: readonly Permission[],
): boolean => {
	if (canGrant(actorPermissions, rolePermissions)) return true;
	if (!actorPermissions.includes("invite.guest")) return false;
	return canGrant([...actorPermissions, "guild.bypass"], rolePermissions);
};

/** 団体を作ったときに用意するロール（あとで編集・追加・削除できる） */
export const DEFAULT_ROLES: readonly {
	key: string;
	name: string;
	color: string;
	permissions: readonly Permission[];
}[] = [
	{
		key: "manager",
		name: "マネージャー",
		color: "#7C3AED",
		permissions: ALL_PERMISSIONS.filter((p) => p !== "guild.bypass"),
	},
	{
		key: "leader",
		name: "リーダー",
		color: "#2563EB",
		permissions: [
			"shift.view",
			"shift.edit",
			"shift.confirm",
			"position.manage",
			"event.manage",
			"staff.manage",
			"member.view",
			"invite.manage",
			"invite.guest",
		],
	},
	{
		key: "staff",
		name: "スタッフ",
		color: "#059669",
		permissions: ["shift.view", "member.view"],
	},
	{
		key: "guest",
		name: "ゲスト",
		color: "#6B7280",
		permissions: ["shift.view", "member.view", "guild.bypass"],
	},
];
