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
	assignableInviteRoles,
	can,
	MEMBER_ROLES,
	strongestRole,
} from "./permissions";
import { slugSchema } from "./slug";

describe("権限", () => {
	it("見ることは全員、編集と確定はリーダー以上、設定とメンバーの管理はオーナーだけ", () => {
		const table = Object.fromEntries(
			MEMBER_ROLES.map((role) => [
				role,
				[
					can(role, "shift.view"),
					can(role, "shift.edit"),
					can(role, "shift.confirm"),
					can(role, "invite.manage"),
					can(role, "member.manage"),
					can(role, "org.settings"),
				],
			]),
		);
		expect(table).toEqual({
			owner: [true, true, true, true, true, true],
			leader: [true, true, true, true, false, false],
			staff: [true, false, false, false, false, false],
			guest: [true, false, false, false, false, false],
		});
	});

	it("招待で渡せる役割：オーナーは渡さない。リーダーはスタッフとゲストまで", () => {
		expect(assignableInviteRoles("owner")).toEqual([
			"leader",
			"staff",
			"guest",
		]);
		expect(assignableInviteRoles("leader")).toEqual(["staff", "guest"]);
		expect(assignableInviteRoles("staff")).toEqual([]);
		expect(assignableInviteRoles("guest")).toEqual([]);
	});
});

describe("強い方が勝つ（団体・テナント・イベントの役割）", () => {
	it("いちばん強い役割になる", () => {
		// 団体ではスタッフでも、テナントでリーダー（店長）ならリーダー
		expect(strongestRole("staff", "leader")).toBe("leader");
		// イベントだけリーダー
		expect(strongestRole("staff", null, "leader")).toBe("leader");
		// ゲストでも、イベントでスタッフならスタッフ
		expect(strongestRole("guest", undefined, "staff")).toBe("staff");
	});

	it("テナント・イベントの役割で、団体の役割を弱めることはできない", () => {
		expect(strongestRole("owner", "staff", "staff")).toBe("owner");
		expect(strongestRole("leader", "staff")).toBe("leader");
	});

	it("割り当てがなければ団体の役割のまま", () => {
		expect(strongestRole("staff")).toBe("staff");
		expect(strongestRole("staff", null, undefined)).toBe("staff");
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
