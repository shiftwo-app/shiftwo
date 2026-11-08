import { createFileRoute, notFound, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useId, useState } from "react";
import type { FormEvent } from "react";
import ErrorList from "../../../../components/manage/ErrorList";
import { useMutationRunner } from "../../../../components/manage/useMutationRunner";
import PreferenceCsvImport from "../../../../components/preferences/PreferenceCsvImport";
import PreferenceForm from "../../../../components/preferences/PreferenceForm";
import SessionReference from "../../../../components/timetable/SessionReference";
import Alert from "../../../../components/ui/Alert";
import Badge from "../../../../components/ui/Badge";
import Button from "../../../../components/ui/Button";
import PageHeader from "../../../../components/ui/PageHeader";
import Section from "../../../../components/ui/Section";
import { formatRange } from "../../../../components/preferences/time";
import {
	fromDateTimeInputValue,
	toDateTimeInputValue,
} from "../../../../components/timeline/datetime";
import type { MessageKey } from "../../../../lib/i18n/messages";
import { useIntlLocale, useT } from "../../../../lib/i18n/react";
import { type Translate, translate } from "../../../../lib/i18n/translate";
import {
	decodePreferenceScope,
	encodePreferenceScope,
	PREFERENCE_LEVEL_LABEL_KEYS,
	type PreferenceInput,
	type PreferenceLevel,
} from "../../../../lib/preferences";
import {
	getPreferencePage,
	removePreferenceFn,
	savePreferenceFn,
	setPreferenceSettingsFn,
} from "../../../../server/preferences.functions";

// スタッフの希望（FR-5）。団体全体の希望を基本にして、テナント・イベントごとに上書きできる。
// 単位は ?scope=org・t:<テナント>・e:<テナント>/<イベント> で選ぶ
export const Route = createFileRoute("/_authed/o/$orgSlug/preferences")({
	// 省けば団体全体（メニューのリンクには付けない）
	validateSearch: (search: Record<string, unknown>): { scope?: string } =>
		search.scope === undefined
			? {}
			: { scope: encodePreferenceScope(decodePreferenceScope(search.scope)) },
	loaderDeps: ({ search }) => ({ scope: search.scope ?? "org" }),
	loader: async ({ params, deps }) => {
		const page = await getPreferencePage({
			data: { orgSlug: params.orgSlug, scope: deps.scope },
		});
		if (!page) throw notFound();
		return page;
	},
	head: ({ match }) => ({
		meta: [
			{
				title: `${translate(match.context.locale, "preferences.title")} | ${translate(match.context.locale, "common.appName")}`,
			},
		],
	}),
	component: PreferencesPage,
});

type Page = NonNullable<Awaited<ReturnType<typeof getPreferencePage>>>;

/** 締切の表示（日本時間） */
const formatDateTime = (date: Date, intlLocale: string) =>
	new Intl.DateTimeFormat(intlLocale, {
		timeZone: "Asia/Tokyo",
		year: "numeric",
		month: "numeric",
		day: "numeric",
		hour: "2-digit",
		minute: "2-digit",
	}).format(date);

const toPeriodMs = (period: Page["period"]) =>
	period
		? {
				start: new Date(period.start).getTime(),
				end: new Date(period.end).getTime(),
			}
		: null;

const SOURCE_OWN_KEYS: Record<PreferenceLevel, MessageKey> = {
	org: "preferences.sourceOwnOrg",
	tenant: "preferences.sourceOwnTenant",
	event: "preferences.sourceOwnEvent",
};
const SOURCE_USING_KEYS: Record<PreferenceLevel, MessageKey> = {
	org: "preferences.sourceUsingOrg",
	tenant: "preferences.sourceUsingTenant",
	event: "preferences.sourceUsingEvent",
};

const sourceText = (
	t: Translate,
	level: PreferenceLevel,
	source: PreferenceLevel | null,
) => {
	if (source === null) return t("preferences.sourceNone");
	if (source === level) return t(SOURCE_OWN_KEYS[level]);
	return t(SOURCE_USING_KEYS[source]);
};

function PreferencesPage() {
	const page = Route.useLoaderData();
	const params = Route.useParams();
	const scope = Route.useSearch().scope ?? "org";
	const navigate = useNavigate({ from: Route.fullPath });
	const save = useServerFn(savePreferenceFn);
	const remove = useServerFn(removePreferenceFn);
	const { run, errors } = useMutationRunner();
	const level = page.scope.level;
	const period = toPeriodMs(page.period);
	const scopeSelectId = useId();
	const t = useT();
	const intlLocale = useIntlLocale();

	const saveFor = (staffId: string) => (input: PreferenceInput) =>
		run(() =>
			save({ data: { orgSlug: params.orgSlug, scope, staffId, input } }),
		);
	const removeFor = (staffId: string) =>
		run(() => remove({ data: { orgSlug: params.orgSlug, scope, staffId } }));

	return (
		<main className="mx-auto max-w-5xl px-4 py-6 sm:px-6">
			<PageHeader
				title={t("preferences.title")}
				description={t("preferences.description")}
			/>

			{/* どこの希望かを選ぶ欄と、その単位の受付の様子 */}
			<div className="mb-6 space-y-3 rounded-lg border border-line bg-surface p-4">
				<div className="flex flex-col gap-1">
					<label htmlFor={scopeSelectId} className="text-sm font-bold text-ink">
						{t("preferences.scopeSelectLabel")}
					</label>
					<select
						id={scopeSelectId}
						value={scope}
						onChange={(event) =>
							void navigate({ search: { scope: event.target.value } })
						}
						className="control w-full sm:max-w-sm"
					>
						<option value="org">{t(PREFERENCE_LEVEL_LABEL_KEYS.org)}</option>
						{page.scopes.map((tenant) => (
							<optgroup key={tenant.tenantSlug} label={tenant.tenantName}>
								<option value={`t:${tenant.tenantSlug}`}>
									{t("preferences.scopeTenantOption", {
										name: tenant.tenantName,
									})}
								</option>
								{tenant.events.map((event) => (
									<option
										key={event.slug}
										value={`e:${tenant.tenantSlug}/${event.slug}`}
									>
										{t("preferences.scopeEventOption", { name: event.name })}
									</option>
								))}
							</optgroup>
						))}
					</select>
				</div>
				<p className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-sm text-ink">
					<span className="font-bold">{page.label}</span>
					{period && (
						<span className="text-ink-muted">
							{t("preferences.period")}{" "}
							<span className="tabular text-ink">
								{formatRange(period, intlLocale)}
							</span>
						</span>
					)}
					{page.deadline ? (
						<span className="inline-flex flex-wrap items-center gap-2 text-ink-muted">
							<span>
								{t("preferences.deadline")}{" "}
								<span className="tabular text-ink">
									{formatDateTime(new Date(page.deadline), intlLocale)}
								</span>
							</span>
							{page.pastDeadline && (
								<Badge tone="warn">{t("preferences.pastDeadlineBadge")}</Badge>
							)}
						</span>
					) : (
						<span className="text-ink-muted">
							{t("preferences.noDeadline")}
						</span>
					)}
				</p>
			</div>

			<ErrorList errors={errors} />

			{page.sessions.length > 0 && (
				<SessionReference sessions={page.sessions} />
			)}

			<Section id="mine-h" title={t("preferences.mineTitle")}>
				{!page.myStaff || !page.mine ? (
					<p className="text-sm text-ink-muted">{t("preferences.notStaff")}</p>
				) : (
					<MyPreference
						key={`${scope}:${page.mine.own?.updatedAt.toString() ?? "none"}`}
						page={page}
						level={level}
						period={period}
						onSave={saveFor(page.myStaff.id)}
						onRemove={() => removeFor(page.myStaff!.id)}
					/>
				)}
			</Section>

			{page.canSetDeadline && (
				<Section id="settings-h" title={t("preferences.settingsTitle")}>
					<PreferenceSettingsForm key={scope} page={page} scope={scope} />
				</Section>
			)}

			{page.all && (
				<Section
					id="all-h"
					title={
						<>
							{t("preferences.allTitle")}
							<span className="tabular">
								{t("preferences.allCount", { count: page.all.length })}
							</span>
						</>
					}
					description={t("preferences.allDescription")}
				>
					<ul className="divide-y divide-line rounded-lg border border-line bg-surface">
						{page.all.map((view) => (
							<StaffPreferenceRow
								key={`${view.staff.id}:${view.own?.updatedAt.toString() ?? "none"}`}
								view={view}
								page={page}
								level={level}
								period={period}
								onSave={saveFor(view.staff.id)}
								onRemove={() => removeFor(view.staff.id)}
							/>
						))}
					</ul>
					<PreferenceCsvImport
						orgSlug={params.orgSlug}
						scope={scope}
						example={{
							staffName: page.all[0]?.staff.name ?? "",
							date: period?.start ?? Date.now(),
							positionName: page.positions[0]?.name,
						}}
					/>
				</Section>
			)}
		</main>
	);
}

type View = NonNullable<Page["all"]>[number];

function MyPreference({
	page,
	level,
	period,
	onSave,
	onRemove,
}: {
	page: Page;
	level: PreferenceLevel;
	period: { start: number; end: number } | null;
	onSave: (input: PreferenceInput) => Promise<boolean>;
	onRemove: () => Promise<boolean>;
}) {
	const mine = page.mine!;
	const t = useT();
	const locked = page.pastDeadline && !page.canManageAll;
	return (
		<div className="space-y-4">
			<div>
				<Badge tone={mine.effective.source === null ? "neutral" : "primary"}>
					{sourceText(t, level, mine.effective.source)}
				</Badge>
			</div>
			{locked && <Alert tone="warn">{t("preferences.lockedAlert")}</Alert>}
			<PreferenceForm
				positions={page.positions}
				timeUnitMinutes={page.timeUnitMinutes}
				period={period}
				// 上書きがまだなければ、使われている希望（上の単位のもの）から始める
				initial={mine.own ?? { ...mine.effective, positionIds: [] }}
				disabled={locked}
				submitLabel={
					mine.own || level === "org"
						? t("preferences.saveButton")
						: t("preferences.saveAsOverride")
				}
				onSubmit={onSave}
			/>
			{mine.own && !locked && (
				<div className="border-t border-line pt-4">
					<Button variant="ghost" size="sm" onClick={() => void onRemove()}>
						{level === "org"
							? t("preferences.removeOrg")
							: level === "event"
								? t("preferences.removeOverrideFromEvent")
								: t("preferences.removeOverrideFromTenant")}
					</Button>
				</div>
			)}
		</div>
	);
}

function StaffPreferenceRow({
	view,
	page,
	level,
	period,
	onSave,
	onRemove,
}: {
	view: View;
	page: Page;
	level: PreferenceLevel;
	period: { start: number; end: number } | null;
	onSave: (input: PreferenceInput) => Promise<boolean>;
	onRemove: () => Promise<boolean>;
}) {
	const [editing, setEditing] = useState(false);
	const t = useT();
	const intlLocale = useIntlLocale();
	const names = view.effective.positionIds
		.map((pid) => page.positions.find((p) => p.id === pid)?.name)
		.filter(Boolean);
	return (
		<li className="space-y-3 px-4 py-3 text-sm">
			<div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
				<span className="font-bold text-ink">{view.staff.name}</span>
				<Badge tone={view.effective.source === null ? "neutral" : "primary"}>
					{sourceText(t, level, view.effective.source)}
				</Badge>
				<Button
					variant="ghost"
					size="sm"
					onClick={() => setEditing((value) => !value)}
					aria-expanded={editing}
					className="ml-auto"
				>
					{editing ? t("common.close") : t("common.edit")}
				</Button>
			</div>
			<dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-ink">
				<dt className="text-ink-muted">{t("preferences.breaks")}</dt>
				<dd className="tabular">
					{view.effective.breaks.length > 0
						? view.effective.breaks
								.map((range) => formatRange(range, intlLocale))
								.join(t("preferences.listSeparator"))
						: t("preferences.none")}
				</dd>
				{page.positionsEnabled && (
					<>
						<dt className="text-ink-muted">{t("preferences.positions")}</dt>
						<dd>
							{names.length > 0
								? names.join(t("preferences.listSeparator"))
								: t("preferences.none")}
						</dd>
					</>
				)}
				{view.effective.memo && (
					<>
						<dt className="text-ink-muted">{t("preferences.memo")}</dt>
						<dd className="break-words whitespace-pre-wrap">
							{view.effective.memo}
						</dd>
					</>
				)}
			</dl>
			{editing && (
				<div className="space-y-4 rounded-md bg-surface-sunken p-4">
					<PreferenceForm
						positions={page.positions}
						timeUnitMinutes={page.timeUnitMinutes}
						period={period}
						initial={view.own ?? { ...view.effective, positionIds: [] }}
						disabled={false}
						submitLabel={t("preferences.saveButton")}
						onSubmit={async (input) => {
							const ok = await onSave(input);
							if (ok) setEditing(false);
							return ok;
						}}
					/>
					{view.own && (
						<div className="border-t border-line pt-3">
							<Button variant="ghost" size="sm" onClick={() => void onRemove()}>
								{level === "org"
									? t("preferences.removeOrg")
									: t("preferences.removeOverride")}
							</Button>
						</div>
					)}
				</div>
			)}
		</li>
	);
}

/** 締切と、イベントなら期間 */
function PreferenceSettingsForm({
	page,
	scope,
}: {
	page: Page;
	scope: string;
}) {
	const id = useId();
	const t = useT();
	const params = Route.useParams();
	const setSettings = useServerFn(setPreferenceSettingsFn);
	const { run, errors } = useMutationRunner();
	const toInput = (value: Date | string | null | undefined) =>
		value ? toDateTimeInputValue(new Date(value).getTime()) : "";
	const [deadline, setDeadline] = useState(toInput(page.deadline));
	const [start, setStart] = useState(toInput(page.period?.start));
	const [end, setEnd] = useState(toInput(page.period?.end));
	const isEvent = page.scope.level === "event";

	const submit = async (event: FormEvent<HTMLFormElement>) => {
		event.preventDefault();
		const startIso = fromDateTimeInputValue(start);
		const endIso = fromDateTimeInputValue(end);
		await run(() =>
			setSettings({
				data: {
					orgSlug: params.orgSlug,
					scope,
					deadline: fromDateTimeInputValue(deadline) ?? null,
					period:
						isEvent && startIso && endIso
							? { start: startIso, end: endIso }
							: null,
				},
			}),
		);
	};

	const field = "flex min-w-0 flex-col gap-1 font-bold text-ink";
	const control = "control tabular w-full font-normal sm:w-auto";
	return (
		<form onSubmit={submit} className="space-y-3 text-sm">
			<ErrorList errors={errors} />
			<div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end">
				<label htmlFor={`${id}-deadline`} className={field}>
					{t("preferences.deadlineField")}
					<input
						id={`${id}-deadline`}
						type="datetime-local"
						value={deadline}
						onChange={(event) => setDeadline(event.target.value)}
						className={control}
					/>
				</label>
				{isEvent && (
					<>
						<label htmlFor={`${id}-start`} className={field}>
							{t("preferences.eventStart")}
							<input
								id={`${id}-start`}
								type="datetime-local"
								value={start}
								onChange={(event) => setStart(event.target.value)}
								className={control}
							/>
						</label>
						<label htmlFor={`${id}-end`} className={field}>
							{t("preferences.eventEnd")}
							<input
								id={`${id}-end`}
								type="datetime-local"
								value={end}
								onChange={(event) => setEnd(event.target.value)}
								className={control}
							/>
						</label>
					</>
				)}
				<Button
					type="submit"
					variant="primary"
					className="self-start sm:self-auto"
				>
					{t("common.save")}
				</Button>
			</div>
			{isEvent && (
				<p className="text-xs leading-relaxed text-ink-muted">
					{t("preferences.periodHelp")}
				</p>
			)}
		</form>
	);
}
