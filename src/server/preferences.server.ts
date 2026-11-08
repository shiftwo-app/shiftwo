// スタッフの希望（FR-5）。サーバー専用。どの操作も、単位（団体・テナント・イベント）とその中の権限を確かめてから行う。
//
//   出す・直す … 自分に紐づくスタッフの希望は、締切までなら本人が直せる。
//               ほかの人の希望と、締切のあとの直しは「全員の希望を扱える人」だけ
//   全員の希望を扱える人 … 団体全体の希望は staff.manage、テナント・イベントの希望は、その単位での shift.edit
//   締切・期間を決める人 … 団体は org.settings、テナントは tenant.manage、イベントは event.manage
import { hasPermission, type Permission } from "../lib/org/permissions";
import {
	effectivePreference,
	isPastDeadline,
	type PreferenceLayers,
	type PreferenceLevel,
	type PreferenceScope,
	preferenceInputSchema,
	preferenceScopeKey,
	type TimeRangeMs,
	validatePreference,
} from "../lib/preferences";
import { prisma } from "../lib/prisma.server";
import {
	findMembership,
	OrgAccessError,
	type OrgMembership,
} from "./org-access.server";
import { findScopeAccess } from "./scope-access.server";

/** 団体全体の希望の時刻の刻み（テナント・イベントの希望は、それぞれの時間粒度を使う） */
const ORG_TIME_UNIT_MINUTES = 15;

export type PreferenceContext = {
	membership: OrgMembership;
	scope: PreferenceScope;
	ids: {
		organizationId: string;
		tenantId: string | null;
		eventId: string | null;
	};
	scopeKey: string;
	/** 画面に出す単位の名前 */
	label: string;
	permissions: Permission[];
	/** 全員の希望を見て、締切のあとでも直せるか */
	canManageAll: boolean;
	/** 締切・期間を決められるか */
	canSetDeadline: boolean;
	deadline: Date | null;
	/** イベントの期間（決まっていなければ null。団体・テナントでは常に null） */
	period: { start: Date; end: Date } | null;
	timeUnitMinutes: number;
};

const notFound = () => new OrgAccessError(404, "Not found");

/** 単位を確かめて、その単位での権限・締切・期間をまとめる。所属していない・単位がない → 404 */
export const requirePreferenceContext = async (
	userId: string,
	orgSlug: string,
	scope: PreferenceScope,
): Promise<PreferenceContext> => {
	if (scope.level === "org") {
		const membership = await findMembership(userId, orgSlug);
		if (!membership) throw notFound();
		const org = await prisma.organization.findUniqueOrThrow({
			where: { id: membership.organization.id },
			select: { preferenceDeadline: true },
		});
		const permissions = membership.member.permissions;
		return {
			membership,
			scope,
			ids: {
				organizationId: membership.organization.id,
				tenantId: null,
				eventId: null,
			},
			scopeKey: "org",
			label: `団体全体（${membership.organization.name}）`,
			permissions,
			canManageAll: hasPermission(permissions, "staff.manage"),
			canSetDeadline: hasPermission(permissions, "org.settings"),
			deadline: org.preferenceDeadline,
			period: null,
			timeUnitMinutes: ORG_TIME_UNIT_MINUTES,
		};
	}

	const access = await findScopeAccess(userId, {
		orgSlug,
		tenantSlug: scope.tenantSlug,
		eventSlug: scope.level === "event" ? scope.eventSlug : null,
	});
	if (!access || !hasPermission(access.permissions, "shift.view")) {
		throw notFound();
	}
	const ids = {
		organizationId: access.organization.id,
		tenantId: access.tenant.id,
		eventId: access.event?.id ?? null,
	};
	const membership: OrgMembership = {
		organization: access.organization,
		member: access.member,
	};
	if (scope.level === "tenant") {
		const tenant = await prisma.tenant.findUniqueOrThrow({
			where: { id: access.tenant.id },
			select: { preferenceDeadline: true },
		});
		return {
			membership,
			scope,
			ids,
			scopeKey: preferenceScopeKey(ids),
			label: `テナント（${access.tenant.name}）`,
			permissions: access.permissions,
			canManageAll: hasPermission(access.permissions, "shift.edit"),
			canSetDeadline: hasPermission(access.member.permissions, "tenant.manage"),
			deadline: tenant.preferenceDeadline,
			period: null,
			timeUnitMinutes: access.tenant.timeUnitMinutes,
		};
	}
	if (!access.event) throw notFound();
	const event = await prisma.event.findUniqueOrThrow({
		where: { id: access.event.id },
		select: { preferenceDeadline: true, startsAt: true, endsAt: true },
	});
	return {
		membership,
		scope,
		ids,
		scopeKey: preferenceScopeKey(ids),
		label: `イベント（${access.tenant.name} / ${access.event.name}）`,
		permissions: access.permissions,
		canManageAll: hasPermission(access.permissions, "shift.edit"),
		canSetDeadline: hasPermission(access.permissions, "event.manage"),
		deadline: event.preferenceDeadline,
		period:
			event.startsAt && event.endsAt
				? { start: event.startsAt, end: event.endsAt }
				: null,
		timeUnitMinutes: access.timeUnitMinutes,
	};
};

/** その単位で選べる持ち場（団体全体では選べない） */
export const selectablePositions = (context: PreferenceContext) =>
	context.scope.level === "org"
		? Promise.resolve([])
		: prisma.position.findMany({
				where: {
					organizationId: context.ids.organizationId,
					tenantId: context.ids.tenantId ?? undefined,
					eventId: context.ids.eventId,
				},
				select: { id: true, name: true, color: true },
				orderBy: { name: "asc" },
			});

/** 自分に紐づくスタッフ（いなければ null） */
export const findMyStaff = (context: PreferenceContext) =>
	prisma.staff.findFirst({
		where: {
			organizationId: context.ids.organizationId,
			memberId: context.membership.member.id,
		},
		select: { id: true, name: true },
	});

export type StoredPreference = {
	breaks: TimeRangeMs[];
	positionIds: string[];
	memo: string;
	updatedAt: Date;
};

/** DB の breaks（Json）を読む。形の合わないものは捨てる */
const parseBreaks = (value: unknown): TimeRangeMs[] =>
	Array.isArray(value)
		? value.flatMap((item) => {
				const start = Date.parse((item as { start?: string })?.start ?? "");
				const end = Date.parse((item as { end?: string })?.end ?? "");
				return Number.isNaN(start) || Number.isNaN(end) ? [] : [{ start, end }];
			})
		: [];

const preferenceSelect = {
	staffId: true,
	scopeKey: true,
	breaks: true,
	memo: true,
	updatedAt: true,
	positions: { select: { id: true } },
} as const;

const toStored = (row: {
	breaks: unknown;
	memo: string;
	updatedAt: Date;
	positions: { id: string }[];
}): StoredPreference => ({
	breaks: parseBreaks(row.breaks),
	positionIds: row.positions.map((p) => p.id),
	memo: row.memo,
	updatedAt: row.updatedAt,
});

type ScopeIds = PreferenceContext["ids"];

const levelOf = (ids: ScopeIds): PreferenceLevel =>
	ids.eventId ? "event" : ids.tenantId ? "tenant" : "org";

/** この単位と、その上の単位（テナント・団体）の名前。近い順 */
const layerKeys = (
	ids: ScopeIds,
): { level: PreferenceLevel; key: string }[] => {
	const keys: { level: PreferenceLevel; key: string }[] = [];
	if (ids.eventId) keys.push({ level: "event", key: `e:${ids.eventId}` });
	if (ids.tenantId) keys.push({ level: "tenant", key: `t:${ids.tenantId}` });
	keys.push({ level: "org", key: "org" });
	return keys;
};

/** スタッフごとの、この単位と上の単位の希望 */
const loadLayers = async (
	ids: ScopeIds,
	staffIds: string[],
): Promise<Map<string, PreferenceLayers<StoredPreference>>> => {
	const keys = layerKeys(ids);
	const rows = await prisma.staffPreference.findMany({
		where: {
			organizationId: ids.organizationId,
			staffId: { in: staffIds },
			scopeKey: { in: keys.map((k) => k.key) },
		},
		select: preferenceSelect,
	});
	const layers = new Map<string, PreferenceLayers<StoredPreference>>();
	for (const staffId of staffIds) {
		layers.set(staffId, { org: null, tenant: null, event: null });
	}
	for (const row of rows) {
		const level = keys.find((k) => k.key === row.scopeKey)?.level;
		const entry = layers.get(row.staffId);
		if (level && entry) entry[level] = toStored(row);
	}
	return layers;
};

/**
 * シフトの単位で使う、スタッフごとの希望（シフトの画面で、希望と違う割り当てを見つけるのに使う）。
 * 見せてよい人かの確かめは呼ぶ側で行う
 */
export const loadEffectivePreferences = async (
	ids: ScopeIds,
	staffIds: string[],
) => {
	const layers = await loadLayers(ids, staffIds);
	const level = levelOf(ids);
	return new Map(
		[...layers].map(([staffId, layer]) => [
			staffId,
			effectivePreference(level, layer),
		]),
	);
};

export type PreferenceView = {
	staff: { id: string; name: string };
	/** この単位に出した希望（上書き）。なければ null */
	own: StoredPreference | null;
	/** この単位で実際に使う希望 */
	effective: ReturnType<typeof effectivePreference<StoredPreference>>;
};

const toView = (
	context: PreferenceContext,
	staff: { id: string; name: string },
	layers: PreferenceLayers<StoredPreference>,
): PreferenceView => ({
	staff,
	own: layers[context.scope.level],
	effective: effectivePreference(context.scope.level, layers),
});

/** 1 人分の希望 */
export const getPreferenceOf = async (
	context: PreferenceContext,
	staff: { id: string; name: string },
): Promise<PreferenceView> => {
	const layers = await loadLayers(context.ids, [staff.id]);
	return toView(context, staff, layers.get(staff.id)!);
};

/** 団体のスタッフ全員の希望（全員の希望を扱える人だけ） */
export const listPreferences = async (
	context: PreferenceContext,
): Promise<PreferenceView[]> => {
	if (!context.canManageAll) throw new OrgAccessError(403, "Forbidden");
	const staffs = await prisma.staff.findMany({
		where: { organizationId: context.ids.organizationId },
		select: { id: true, name: true },
		orderBy: { name: "asc" },
	});
	const layers = await loadLayers(
		context.ids,
		staffs.map((s) => s.id),
	);
	return staffs.map((staff) => toView(context, staff, layers.get(staff.id)!));
};

type Fail = { ok: false; errors: string[] };
const fail = (...errors: string[]): Fail => ({ ok: false, errors });

/** このスタッフの希望を、この人が直してよいか。だめなら理由 */
const editRefusal = async (
	context: PreferenceContext,
	staffId: string,
	now: Date,
): Promise<Fail | { ok: true; staff: { id: string; name: string } }> => {
	const staff = await prisma.staff.findFirst({
		where: { id: staffId, organizationId: context.ids.organizationId },
		select: { id: true, name: true, memberId: true },
	});
	if (!staff) return fail("スタッフが見つかりません");
	if (context.canManageAll) return { ok: true, staff };
	if (staff.memberId !== context.membership.member.id) {
		return fail("ほかの人の希望は直せません");
	}
	if (isPastDeadline(context.deadline, now)) {
		return fail(
			"締切を過ぎたので、希望は変えられません。変えたいときはシフトを組む人に頼んでください",
		);
	}
	return { ok: true, staff };
};

/** 希望を出す・直す（この単位の希望を、まるごと置き換える） */
export const savePreference = async (
	context: PreferenceContext,
	staffId: string,
	body: unknown,
	now = new Date(),
): Promise<{ ok: true } | Fail> => {
	const allowed = await editRefusal(context, staffId, now);
	if (!allowed.ok) return allowed;
	const parsed = preferenceInputSchema.safeParse(body);
	if (!parsed.success) {
		return fail(...parsed.error.issues.map((issue) => issue.message));
	}
	const input = parsed.data;
	const breaks = input.breaks.map((b) => ({
		start: Date.parse(b.start),
		end: Date.parse(b.end),
	}));
	if (context.scope.level === "org" && input.positionIds.length > 0) {
		return fail(
			"団体全体の希望では、持ち場は選べません（テナント・イベントの希望で選んでください）",
		);
	}
	const errors = validatePreference(
		{ breaks, positionIds: input.positionIds },
		{
			timeUnitMinutes: context.timeUnitMinutes,
			period: context.period
				? {
						start: context.period.start.getTime(),
						end: context.period.end.getTime(),
					}
				: null,
		},
	);
	if (errors.length > 0) return fail(...errors);

	// 持ち場は、この単位のものだけ（ほかの単位・ほかの団体の ID を混ぜさせない）
	if (input.positionIds.length > 0) {
		const found = await prisma.position.count({
			where: {
				id: { in: input.positionIds },
				organizationId: context.ids.organizationId,
				tenantId: context.ids.tenantId ?? undefined,
				eventId: context.ids.eventId,
			},
		});
		if (found !== input.positionIds.length) {
			return fail("選んだ持ち場が見つかりません");
		}
	}

	const data = {
		breaks: [...breaks]
			.sort((a, b) => a.start - b.start)
			.map((b) => ({
				start: new Date(b.start).toISOString(),
				end: new Date(b.end).toISOString(),
			})),
		memo: input.memo,
		positions: { set: input.positionIds.map((id) => ({ id })) },
	};
	await prisma.staffPreference.upsert({
		where: {
			staffId_scopeKey: {
				staffId: allowed.staff.id,
				scopeKey: context.scopeKey,
			},
		},
		create: {
			...context.ids,
			scopeKey: context.scopeKey,
			staffId: allowed.staff.id,
			...data,
			positions: { connect: input.positionIds.map((id) => ({ id })) },
		},
		update: data,
	});
	return { ok: true };
};

/** この単位の希望（上書き）をやめる。上の単位の希望が使われるようになる */
export const removePreference = async (
	context: PreferenceContext,
	staffId: string,
	now = new Date(),
): Promise<{ ok: true } | Fail> => {
	const allowed = await editRefusal(context, staffId, now);
	if (!allowed.ok) return allowed;
	await prisma.staffPreference.deleteMany({
		where: {
			organizationId: context.ids.organizationId,
			staffId: allowed.staff.id,
			scopeKey: context.scopeKey,
		},
	});
	return { ok: true };
};

/** 締切と、イベントなら期間を決める（締切・期間を決められる人だけ） */
export const setPreferenceSettings = async (
	context: PreferenceContext,
	settings: {
		deadline: Date | null;
		period?: { start: Date; end: Date } | null;
	},
): Promise<{ ok: true } | Fail> => {
	if (!context.canSetDeadline) {
		return fail("締切を決める権限がありません");
	}
	const { organizationId, tenantId, eventId } = context.ids;
	if (eventId) {
		const period = settings.period ?? null;
		if (period && period.end <= period.start) {
			return fail("イベントの終わりは始まりより後にしてください");
		}
		await prisma.event.updateMany({
			where: { id: eventId, organizationId },
			data: {
				preferenceDeadline: settings.deadline,
				startsAt: period?.start ?? null,
				endsAt: period?.end ?? null,
			},
		});
	} else if (tenantId) {
		await prisma.tenant.updateMany({
			where: { id: tenantId, organizationId },
			data: { preferenceDeadline: settings.deadline },
		});
	} else {
		await prisma.organization.update({
			where: { id: organizationId },
			data: { preferenceDeadline: settings.deadline },
		});
	}
	return { ok: true };
};

/** 希望を出せる単位の一覧（シフトを見られるテナントとイベント） */
export const listPreferenceScopes = async (
	membership: OrgMembership,
	userId: string,
): Promise<
	{
		tenantSlug: string;
		tenantName: string;
		events: { slug: string; name: string }[];
	}[]
> => {
	const tenants = await prisma.tenant.findMany({
		where: { organizationId: membership.organization.id },
		select: {
			slug: true,
			name: true,
			events: { select: { slug: true, name: true }, orderBy: { name: "asc" } },
		},
		orderBy: { name: "asc" },
	});
	const visible = await Promise.all(
		tenants.map(async (tenant) => {
			const access = await findScopeAccess(userId, {
				orgSlug: membership.organization.slug,
				tenantSlug: tenant.slug,
			});
			return access && hasPermission(access.permissions, "shift.view")
				? tenant
				: null;
		}),
	);
	return visible.flatMap((tenant) =>
		tenant
			? [
					{
						tenantSlug: tenant.slug,
						tenantName: tenant.name,
						events: tenant.events,
					},
				]
			: [],
	);
};
