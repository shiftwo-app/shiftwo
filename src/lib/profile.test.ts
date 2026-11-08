import { describe, expect, it } from "vite-plus/test";
import { NAME_MAX_LENGTH, nameSchema, suggestNameFromEmail } from "./profile";

describe("nameSchema", () => {
	it("前後の空白を取って受け付ける", () => {
		expect(nameSchema.parse("  山田 太郎 ")).toBe("山田 太郎");
	});

	it("空や空白だけは受け付けない", () => {
		expect(nameSchema.safeParse("").success).toBe(false);
		expect(nameSchema.safeParse("   ").success).toBe(false);
	});

	it(`${NAME_MAX_LENGTH} 文字を超えると受け付けない`, () => {
		expect(nameSchema.safeParse("あ".repeat(NAME_MAX_LENGTH)).success).toBe(
			true,
		);
		expect(nameSchema.safeParse("あ".repeat(NAME_MAX_LENGTH + 1)).success).toBe(
			false,
		);
	});
});

describe("suggestNameFromEmail", () => {
	it("@ より前を使う", () => {
		expect(suggestNameFromEmail("leader@example.com")).toBe("leader");
	});
});
