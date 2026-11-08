import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { serverT } from "../lib/i18n/request-locale.server";
import { isPastDeadline, preferenceScopeSchema } from "../lib/preferences";
import { requireUserMiddleware } from "./auth-middleware";
import { OrgAccessError } from "./org-access.server";
import {
	findMyStaff,
	getPreferenceOf,
	listPreferences,
	listPreferenceScopes,
	removePreference,
	requirePreferenceContext,
	savePreference,
	selectablePositions,
	setPreferenceSettings,
} from "./preferences.server";

// 希望（FR-5）の画面から呼ぶ server function。どれもログインが必要で、単位と権限は preferences.server.ts で毎回確かめる

const orgSlug = z.string().min(1);
const isoOrNull = z.iso.datetime({ offset: true }).nullable();

/** 見つからないときの結果（リクエストの言語で） */
const notFoundResult = () => ({
	ok: false as const,
	errors: [serverT("preferences.notFound")],
});

/** 見つからない（所属していない・単位がない）を null にする。ほかは投げ直す */
const orNull = async <T>(load: () => Promise<T>): Promise<T | null> => {
	try {
		return await load();
	} catch (error) {
		if (error instanceof OrgAccessError) return null;
		throw error;
	}
};

/** 希望の画面：この単位の締切・期間、自分の希望、（扱える人には）全員の希望、選べる単位の一覧 */
export const getPreferencePage = createServerFn({ method: "GET" })
	.middleware([requireUserMiddleware])
	.validator((data: { orgSlug: unknown; scope: unknown }) => ({
		orgSlug: orgSlug.parse(data.orgSlug),
		scope: preferenceScopeSchema.parse(data.scope),
	}))
	.handler(({ data, context }) =>
		orNull(async () => {
			const preference = await requirePreferenceContext(
				context.user.id,
				data.orgSlug,
				data.scope,
			);
			const [positions, myStaff, scopes, all] = await Promise.all([
				selectablePositions(preference),
				findMyStaff(preference),
				listPreferenceScopes(preference.membership, context.user.id),
				preference.canManageAll
					? listPreferences(preference)
					: Promise.resolve(null),
			]);
			return {
				scope: data.scope,
				label: preference.label,
				deadline: preference.deadline,
				pastDeadline: isPastDeadline(preference.deadline, new Date()),
				period: preference.period,
				timeUnitMinutes: preference.timeUnitMinutes,
				positionsEnabled: preference.positionsEnabled,
				canManageAll: preference.canManageAll,
				canSetDeadline: preference.canSetDeadline,
				positions,
				myStaff,
				mine: myStaff ? await getPreferenceOf(preference, myStaff) : null,
				all,
				scopes,
			};
		}),
	);

/** 希望を出す・直す */
export const savePreferenceFn = createServerFn({ method: "POST" })
	.middleware([requireUserMiddleware])
	.validator(
		(data: {
			orgSlug: unknown;
			scope: unknown;
			staffId: unknown;
			input: unknown;
		}) => ({
			orgSlug: orgSlug.parse(data.orgSlug),
			scope: preferenceScopeSchema.parse(data.scope),
			staffId: z.string().min(1).parse(data.staffId),
			input: data.input,
		}),
	)
	.handler(async ({ data, context }) => {
		const preference = await orNull(() =>
			requirePreferenceContext(context.user.id, data.orgSlug, data.scope),
		);
		if (!preference) return notFoundResult();
		return savePreference(preference, data.staffId, data.input);
	});

/** この単位の希望（上書き）をやめる */
export const removePreferenceFn = createServerFn({ method: "POST" })
	.middleware([requireUserMiddleware])
	.validator(
		(data: { orgSlug: unknown; scope: unknown; staffId: unknown }) => ({
			orgSlug: orgSlug.parse(data.orgSlug),
			scope: preferenceScopeSchema.parse(data.scope),
			staffId: z.string().min(1).parse(data.staffId),
		}),
	)
	.handler(async ({ data, context }) => {
		const preference = await orNull(() =>
			requirePreferenceContext(context.user.id, data.orgSlug, data.scope),
		);
		if (!preference) return notFoundResult();
		return removePreference(preference, data.staffId);
	});

/** 締切と、イベントなら期間を決める */
export const setPreferenceSettingsFn = createServerFn({ method: "POST" })
	.middleware([requireUserMiddleware])
	.validator(
		(data: {
			orgSlug: unknown;
			scope: unknown;
			deadline: unknown;
			period: unknown;
		}) => ({
			orgSlug: orgSlug.parse(data.orgSlug),
			scope: preferenceScopeSchema.parse(data.scope),
			deadline: isoOrNull.parse(data.deadline),
			period: z
				.object({
					start: z.iso.datetime({ offset: true }),
					end: z.iso.datetime({ offset: true }),
				})
				.nullable()
				.parse(data.period ?? null),
		}),
	)
	.handler(async ({ data, context }) => {
		const preference = await orNull(() =>
			requirePreferenceContext(context.user.id, data.orgSlug, data.scope),
		);
		if (!preference) return notFoundResult();
		return setPreferenceSettings(preference, {
			deadline: data.deadline ? new Date(data.deadline) : null,
			period: data.period
				? { start: new Date(data.period.start), end: new Date(data.period.end) }
				: null,
		});
	});
