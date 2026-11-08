import { createFileRoute, notFound, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useId, useState } from "react";
import type { FormEvent } from "react";
import ErrorList from "../../../../components/manage/ErrorList";
import { useMutationRunner } from "../../../../components/manage/useMutationRunner";
import PreferenceForm from "../../../../components/preferences/PreferenceForm";
import { formatRange } from "../../../../components/preferences/time";
import {
	fromDateTimeInputValue,
	toDateTimeInputValue,
} from "../../../../components/timeline/datetime";
import {
	decodePreferenceScope,
	encodePreferenceScope,
	PREFERENCE_LEVEL_LABELS,
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
	head: () => ({ meta: [{ title: "希望 | shiftwo" }] }),
	component: PreferencesPage,
});

type Page = NonNullable<Awaited<ReturnType<typeof getPreferencePage>>>;

const dateTimeFormatter = new Intl.DateTimeFormat("ja-JP", {
	timeZone: "Asia/Tokyo",
	year: "numeric",
	month: "numeric",
	day: "numeric",
	hour: "2-digit",
	minute: "2-digit",
});
const formatDateTime = (date: Date) => dateTimeFormatter.format(date);

const toPeriodMs = (period: Page["period"]) =>
	period
		? {
				start: new Date(period.start).getTime(),
				end: new Date(period.end).getTime(),
			}
		: null;

const sourceText = (level: PreferenceLevel, source: PreferenceLevel | null) => {
	if (source === null) return "まだ出していません";
	if (source === level) return `この${PREFERENCE_LEVEL_LABELS[level]}の希望`;
	return `${PREFERENCE_LEVEL_LABELS[source]}の希望を使っています`;
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

	const saveFor = (staffId: string) => (input: PreferenceInput) =>
		run(() =>
			save({ data: { orgSlug: params.orgSlug, scope, staffId, input } }),
		);
	const removeFor = (staffId: string) =>
		run(() => remove({ data: { orgSlug: params.orgSlug, scope, staffId } }));

	return (
		<main className="mx-auto max-w-3xl space-y-8 p-4">
			<div className="space-y-2">
				<h1 className="text-xl font-bold">希望</h1>
				<p className="text-sm text-gray-600">
					休憩・参加できない時間、やりたい持ち場、メモを出せます。団体全体の希望を基本にして、テナントやイベントごとに上書きできます（イベントのシフトでは、イベント
					→ テナント → 団体全体の順に、ある希望を使います）。
				</p>
				<label htmlFor={scopeSelectId} className="flex flex-col gap-1 text-sm">
					どこの希望か
					<select
						id={scopeSelectId}
						value={scope}
						onChange={(event) =>
							void navigate({ search: { scope: event.target.value } })
						}
						className="rounded border px-2 py-1"
					>
						<option value="org">団体全体</option>
						{page.scopes.map((tenant) => (
							<optgroup key={tenant.tenantSlug} label={tenant.tenantName}>
								<option value={`t:${tenant.tenantSlug}`}>
									{tenant.tenantName}（テナント全体）
								</option>
								{tenant.events.map((event) => (
									<option
										key={event.slug}
										value={`e:${tenant.tenantSlug}/${event.slug}`}
									>
										イベント：{event.name}
									</option>
								))}
							</optgroup>
						))}
					</select>
				</label>
				<p className="text-sm">
					{page.label}
					{period && `・期間 ${formatRange(period)}`}
					{page.deadline
						? `・締切 ${formatDateTime(new Date(page.deadline))}${page.pastDeadline ? "（締め切りました）" : ""}`
						: "・締切なし"}
				</p>
			</div>

			<ErrorList errors={errors} />

			<section aria-labelledby="mine-h" className="space-y-3">
				<h2 id="mine-h" className="text-lg font-semibold">
					自分の希望
				</h2>
				{!page.myStaff || !page.mine ? (
					<p className="text-sm">
						あなたはまだスタッフとして登録されていません。シフトを組む人に、スタッフへの紐づけを頼んでください。
					</p>
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
			</section>

			{page.canSetDeadline && (
				<section aria-labelledby="settings-h" className="space-y-3">
					<h2 id="settings-h" className="text-lg font-semibold">
						受付の設定
					</h2>
					<PreferenceSettingsForm key={scope} page={page} scope={scope} />
				</section>
			)}

			{page.all && (
				<section aria-labelledby="all-h" className="space-y-3">
					<h2 id="all-h" className="text-lg font-semibold">
						みんなの希望（{page.all.length} 人）
					</h2>
					<p className="text-sm text-gray-600">
						シフトを組む人は、締切のあとでも直せます。
					</p>
					<ul className="divide-y rounded border">
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
				</section>
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
	const locked = page.pastDeadline && !page.canManageAll;
	return (
		<div className="space-y-3">
			<p className="text-sm">{sourceText(level, mine.effective.source)}</p>
			{locked && (
				<p
					role="status"
					className="rounded bg-amber-50 p-2 text-sm text-amber-900"
				>
					締切を過ぎたので、希望は変えられません。変えたいときはシフトを組む人に頼んでください。
				</p>
			)}
			<PreferenceForm
				positions={page.positions}
				timeUnitMinutes={page.timeUnitMinutes}
				period={period}
				// 上書きがまだなければ、使われている希望（上の単位のもの）から始める
				initial={mine.own ?? { ...mine.effective, positionIds: [] }}
				disabled={locked}
				submitLabel={
					mine.own || level === "org"
						? "保存する"
						: "この単位の希望として保存する"
				}
				onSubmit={onSave}
			/>
			{mine.own && !locked && (
				<button
					type="button"
					onClick={() => void onRemove()}
					className="text-sm underline"
				>
					{level === "org"
						? "希望を消す"
						: `上書きをやめる（${level === "event" ? "テナントか団体全体" : "団体全体"}の希望を使う）`}
				</button>
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
	const names = view.effective.positionIds
		.map((pid) => page.positions.find((p) => p.id === pid)?.name)
		.filter(Boolean);
	return (
		<li className="space-y-2 p-3 text-sm">
			<div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
				<span className="font-semibold">{view.staff.name}</span>
				<span className="text-xs text-gray-600">
					{sourceText(level, view.effective.source)}
				</span>
				<button
					type="button"
					onClick={() => setEditing((value) => !value)}
					aria-expanded={editing}
					className="ml-auto underline"
				>
					{editing ? "閉じる" : "直す"}
				</button>
			</div>
			<dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1">
				<dt className="text-gray-600">休憩</dt>
				<dd>
					{view.effective.breaks.length > 0
						? view.effective.breaks.map(formatRange).join("、")
						: "なし"}
				</dd>
				{level !== "org" && (
					<>
						<dt className="text-gray-600">持ち場</dt>
						<dd>{names.length > 0 ? names.join("、") : "なし"}</dd>
					</>
				)}
				{view.effective.memo && (
					<>
						<dt className="text-gray-600">メモ</dt>
						<dd className="whitespace-pre-wrap">{view.effective.memo}</dd>
					</>
				)}
			</dl>
			{editing && (
				<div className="space-y-2 rounded bg-gray-50 p-3">
					<PreferenceForm
						positions={page.positions}
						timeUnitMinutes={page.timeUnitMinutes}
						period={period}
						initial={view.own ?? { ...view.effective, positionIds: [] }}
						disabled={false}
						submitLabel="保存する"
						onSubmit={async (input) => {
							const ok = await onSave(input);
							if (ok) setEditing(false);
							return ok;
						}}
					/>
					{view.own && (
						<button
							type="button"
							onClick={() => void onRemove()}
							className="underline"
						>
							{level === "org" ? "希望を消す" : "上書きをやめる"}
						</button>
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

	const field = "flex flex-col gap-1";
	const control = "rounded border px-2 py-1";
	return (
		<form onSubmit={submit} className="space-y-3 text-sm">
			<ErrorList errors={errors} />
			<div className="flex flex-wrap items-end gap-3">
				<label htmlFor={`${id}-deadline`} className={field}>
					締切（空なら締切なし）
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
							イベントの始まり
							<input
								id={`${id}-start`}
								type="datetime-local"
								value={start}
								onChange={(event) => setStart(event.target.value)}
								className={control}
							/>
						</label>
						<label htmlFor={`${id}-end`} className={field}>
							イベントの終わり
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
				<button
					type="submit"
					className="rounded bg-blue-600 px-3 py-1 font-semibold text-white"
				>
					保存
				</button>
			</div>
			{isEvent && (
				<p className="text-xs text-gray-600">
					期間を決めると、期間の外の休憩は出せなくなります（両方を空にすると、期間なし）。
				</p>
			)}
		</form>
	);
}
