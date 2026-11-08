// テナント・イベント・持ち場・スタッフの入力の決まり。画面とサーバーの両方で使う
import { z } from "zod";
import type { MessageKey } from "./i18n/messages";
import { slugSchema } from "./org/slug";
import { nameSchema } from "./profile";

/** 時間粒度（FR-4-A）。5 / 10 / 15 / 30 分 */
export const TIME_UNIT_OPTIONS = [5, 10, 15, 30] as const;
export const timeUnitSchema = z
	.number()
	.refine(
		(value) => (TIME_UNIT_OPTIONS as readonly number[]).includes(value),
		"settings.timeUnitInvalid",
	);

// エラーはメッセージのキー。文章にするのは受け取る側（サーバーは serverT、画面は t）
const titleSchema = (
	max: number,
	messages: { required: MessageKey; tooLong: MessageKey },
) => z.string().trim().min(1, messages.required).max(max, messages.tooLong);

const colorSchema = z
	.string()
	.regex(/^#[0-9a-fA-F]{6}$/, "settings.colorInvalid");

export const tenantInputSchema = z.object({
	name: titleSchema(80, {
		required: "settings.tenantNameRequired",
		tooLong: "settings.tenantNameTooLong",
	}),
	slug: slugSchema,
	timeUnitMinutes: timeUnitSchema,
});
export type TenantInput = z.infer<typeof tenantInputSchema>;

export const eventInputSchema = z.object({
	name: titleSchema(80, {
		required: "settings.eventNameRequired",
		tooLong: "settings.eventNameTooLong",
	}),
	slug: slugSchema,
	// null ならテナントの時間粒度を使う
	timeUnitMinutes: timeUnitSchema.nullable(),
});
export type EventInput = z.infer<typeof eventInputSchema>;

export const positionInputSchema = z.object({
	name: titleSchema(40, {
		required: "settings.positionNameRequired",
		tooLong: "settings.positionNameTooLong",
	}),
	color: colorSchema,
	requiredStaffCount: z
		.number()
		.int("settings.requiredCountInteger")
		.min(0, "settings.requiredCountMin")
		.max(99, "settings.requiredCountMax"),
	// 休憩の持ち場か（レポートで休憩として数え、充足率には入れない）
	isBreak: z.boolean(),
});
export type PositionInput = z.infer<typeof positionInputSchema>;

export const staffInputSchema = z.object({
	name: nameSchema,
	// 紐づける団体のメンバー（null なら紐づけない）
	memberId: z.string().min(1).nullable(),
});
export type StaffInput = z.infer<typeof staffInputSchema>;
