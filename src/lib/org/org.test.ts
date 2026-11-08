import { describe, expect, it } from "vite-plus/test";
import {
	formatInviteCode,
	generateInviteCode,
	INVITE_CODE_ALPHABET,
	inviteUnusableReason,
	isWellFormedInviteCode,
	normalizeInviteCode,
} from "./invite-code";
import {
	ALL_PERMISSIONS,
	canGrant,
	canInviteWith,
	DEFAULT_ROLES,
	hasPermission,
	permissionsOf,
	scopedPermissions,
} from "./permissions";
import { slugSchema } from "./slug";

describe("ロールと権限", () => {
	const role = (...permissions: string[]) => ({ permissions });

	it("持っているロールの権限を足し合わせる。知らない項目は捨てる", () => {
		expect(
			permissionsOf(false, [
				role("shift.view"),
				role("shift.edit", "unknown.thing"),
			]),
		).toEqual(["shift.view", "shift.edit"]);
		expect(permissionsOf(false, [])).toEqual([]);
	});

	it("オーナーはロールがなくても全権限", () => {
		expect(permissionsOf(true, [])).toEqual(ALL_PERMISSIONS);
	});

	it("テナント・イベントのロールからは、シフトに関わる権限だけを上乗せする", () => {
		const org = permissionsOf(false, [role("shift.view", "member.view")]);
		const tenantRoles = [role("shift.edit", "member.manage", "tenant.manage")];
		const eventRoles = [role("shift.confirm")];
		expect(scopedPermissions(org, tenantRoles, eventRoles)).toEqual([
			"shift.view",
			"shift.edit",
			"shift.confirm",
			"member.view",
		]);
	});

	it("テナント・イベントのロールで、団体での権限を減らすことはできない", () => {
		const org = permissionsOf(false, [role("shift.view", "shift.edit")]);
		expect(scopedPermissions(org, [role("shift.view")])).toEqual([
			"shift.view",
			"shift.edit",
		]);
	});

	it("自分が持っている権限の範囲でしか渡せない（権限の乗っ取り防止）", () => {
		const leader = ["shift.view", "shift.edit", "invite.manage"] as const;
		expect(canGrant(leader, ["shift.view"])).toBe(true);
		expect(canGrant(leader, ["shift.view", "member.manage"])).toBe(false);
		expect(canGrant(ALL_PERMISSIONS, ["member.manage", "org.settings"])).toBe(
			true,
		);
	});

	it("「ゲストを招待する」を持つ人は、Discord の条件の免除を含むロールを招待で渡せる（それ以外の例外はない）", () => {
		const leader = [
			"shift.view",
			"member.view",
			"invite.manage",
			"invite.guest",
		] as const;
		const guestRole = ["shift.view", "member.view", "guild.bypass"] as const;
		expect(canInviteWith(leader, guestRole)).toBe(true);
		// 免除のほかに自分にない権限があれば渡せない
		expect(canInviteWith(leader, [...guestRole, "member.manage"])).toBe(false);
		// 「ゲストを招待する」がなければ渡せない
		expect(
			canInviteWith(["shift.view", "member.view", "invite.manage"], guestRole),
		).toBe(false);
		// 招待以外（ロールの付け外し）の判定は変わらない
		expect(canGrant(leader, guestRole)).toBe(false);
	});

	it("最初のロール：マネージャー・リーダー・スタッフ・ゲスト。ゲストだけ Discord の条件を免除", () => {
		expect(DEFAULT_ROLES.map((r) => r.name)).toEqual([
			"マネージャー",
			"リーダー",
			"スタッフ",
			"ゲスト",
		]);
		const byName = Object.fromEntries(
			DEFAULT_ROLES.map((r) => [r.name, r.permissions]),
		);
		expect(hasPermission(byName["ゲスト"], "guild.bypass")).toBe(true);
		expect(hasPermission(byName["マネージャー"], "guild.bypass")).toBe(false);
		expect(hasPermission(byName["リーダー"], "shift.edit")).toBe(true);
		expect(hasPermission(byName["リーダー"], "member.manage")).toBe(false);
		expect(hasPermission(byName["スタッフ"], "shift.edit")).toBe(false);
		expect(hasPermission(byName["マネージャー"], "member.manage")).toBe(true);
		expect(hasPermission(byName["リーダー"], "invite.guest")).toBe(true);
		expect(hasPermission(byName["マネージャー"], "invite.guest")).toBe(true);
	});
});

describe("招待コード", () => {
	it("8 文字で、読み間違えやすい文字を使わない", () => {
		for (let i = 0; i < 200; i++) {
			const code = generateInviteCode();
			expect(code).toHaveLength(8);
			expect(isWellFormedInviteCode(code)).toBe(true);
		}
		expect(INVITE_CODE_ALPHABET).not.toMatch(/[0O1IL]/);
	});

	it("入力の小文字・空白・ハイフンをそろえる", () => {
		expect(normalizeInviteCode(" abcd-efgh ")).toBe("ABCDEFGH");
		expect(formatInviteCode("ABCDEFGH")).toBe("ABCD-EFGH");
	});

	it("取り消し・期限切れ・回数切れを見分ける", () => {
		const now = new Date("2026-11-08T00:00:00Z");
		const base = {
			expiresAt: new Date("2026-11-09T00:00:00Z"),
			revokedAt: null,
			maxUses: 1,
			uses: 0,
		};
		expect(inviteUnusableReason(base, now)).toBeNull();
		expect(inviteUnusableReason({ ...base, revokedAt: now }, now)).toBe(
			"revoked",
		);
		expect(inviteUnusableReason({ ...base, expiresAt: now }, now)).toBe(
			"expired",
		);
		expect(inviteUnusableReason({ ...base, uses: 1 }, now)).toBe("used_up");
		expect(
			inviteUnusableReason({ ...base, maxUses: null, uses: 99 }, now),
		).toBeNull();
	});
});

describe("団体の URL", () => {
	it("英小文字・数字・ハイフンにそろえ、大文字は小文字にする", () => {
		expect(slugSchema.parse(" TechConf-2026 ")).toBe("techconf-2026");
	});

	it("短すぎる・記号・ハイフンで始まる・予約語は使えない", () => {
		for (const bad of [
			"ab",
			"tech_conf",
			"-tech",
			"tech-",
			"日本語",
			"new",
			"api",
		]) {
			expect(slugSchema.safeParse(bad).success).toBe(false);
		}
	});
});
