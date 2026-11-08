// テナント・イベント・持ち場・スタッフの入力の決まり。画面とサーバーの両方で使う
import { z } from "zod";
import { slugSchema } from "./org/slug";
import { nameSchema } from "./profile";

/** 時間粒度（FR-4-A）。5 / 10 / 15 / 30 分 */
export const TIME_UNIT_OPTIONS = [5, 10, 15, 30] as const;
export const timeUnitSchema = z
	.number()
	.refine(
		(value) => (TIME_UNIT_OPTIONS as readonly number[]).includes(value),
		"時間粒度は 5・10・15・30 分のどれかにしてください",
	);

const titleSchema = (label: string, max: number) =>
	z
		.string()
		.trim()
		.min(1, `${label}を入力してください`)
		.max(max, `${label}は ${max} 文字までにしてください`);

const colorSchema = z
	.string()
	.regex(/^#[0-9a-fA-F]{6}$/, "色は #RRGGBB の形で指定してください");

export const tenantInputSchema = z.object({
	name: titleSchema("テナント名", 80),
	slug: slugSchema,
	timeUnitMinutes: timeUnitSchema,
});
export type TenantInput = z.infer<typeof tenantInputSchema>;

export const eventInputSchema = z.object({
	name: titleSchema("イベント名", 80),
	slug: slugSchema,
	// null ならテナントの時間粒度を使う
	timeUnitMinutes: timeUnitSchema.nullable(),
});
export type EventInput = z.infer<typeof eventInputSchema>;

export const positionInputSchema = z.object({
	name: titleSchema("持ち場の名前", 40),
	color: colorSchema,
	requiredStaffCount: z
		.number()
		.int("必要な人数は整数にしてください")
		.min(0, "必要な人数は 0 人以上にしてください")
		.max(99, "必要な人数は 99 人までにしてください"),
});
export type PositionInput = z.infer<typeof positionInputSchema>;

export const staffInputSchema = z.object({
	name: nameSchema,
	// 紐づける団体のメンバー（null なら紐づけない）
	memberId: z.string().min(1).nullable(),
});
export type StaffInput = z.infer<typeof staffInputSchema>;
