import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import ConfirmButton from "../../../../../../../../components/manage/ConfirmButton";
import ErrorList from "../../../../../../../../components/manage/ErrorList";
import Alert from "../../../../../../../../components/ui/Alert";
import PageHeader from "../../../../../../../../components/ui/PageHeader";
import Section from "../../../../../../../../components/ui/Section";
import PositionsEditor from "../../../../../../../../components/manage/PositionsEditor";
import PositionsToggle from "../../../../../../../../components/manage/PositionsToggle";
import ScopedRolesEditor from "../../../../../../../../components/manage/ScopedRolesEditor";
import TenantOrEventForm from "../../../../../../../../components/manage/TenantOrEventForm";
import { useMutationRunner } from "../../../../../../../../components/manage/useMutationRunner";
import { hasPermission } from "../../../../../../../../lib/org/permissions";
import {
	deleteEventFn,
	getScopedRoleAssignments,
	updateEventFn,
} from "../../../../../../../../server/manage.functions";
import { getShiftBoard } from "../../../../../../../../server/shifts.functions";
import { ShiftStatus } from "../../../../../../../../types";
import { useT } from "../../../../../../../../lib/i18n/react";

// イベントの設定：名前・URL 名・時間粒度の上書き、イベントの持ち場、イベントでのロールの割り当て、削除
export const Route = createFileRoute(
	"/_authed/o/$orgSlug/t/$tenantSlug/e/$eventSlug/settings",
)({
	loader: async ({ params, context }) => {
		const [board, assignments] = await Promise.all([
			getShiftBoard({ data: { ...params, status: ShiftStatus.confirmed } }),
			hasPermission(context.member.permissions, "member.manage")
				? getScopedRoleAssignments({ data: params })
				: Promise.resolve(null),
		]);
		return { positions: board.positions, assignments };
	},
	component: EventSettingsPage,
});

function EventSettingsPage() {
	const { eventContext } = Route.useRouteContext();
	const { positions, assignments } = Route.useLoaderData();
	const params = Route.useParams();
	const router = useRouter();
	const t = useT();
	const updateEvent = useServerFn(updateEventFn);
	const removeEvent = useServerFn(deleteEventFn);
	const { run, errors } = useMutationRunner();
	const event = eventContext.event;
	const canManageEvent = hasPermission(
		eventContext.permissions,
		"event.manage",
	);
	const canManagePositions = hasPermission(
		eventContext.permissions,
		"position.manage",
	);

	return (
		<main className="mx-auto max-w-5xl px-4 py-6 sm:px-6">
			<PageHeader title={t("settings.eventSettingsTitle")} />
			<ErrorList errors={errors} className="mb-6" />
			<div>
				{canManageEvent && (
					<Section id="event-settings-basic" title={t("settings.eventSection")}>
						<TenantOrEventForm
							kind="event"
							initial={event}
							submitLabel={t("common.save")}
							onSubmit={async (value) => {
								let newSlug: string | null = null;
								const ok = await run(async () => {
									const result = await updateEvent({
										data: { ...params, event: value },
									});
									if (result.ok) newSlug = result.slug;
									return result;
								});
								if (ok && newSlug && newSlug !== event.slug) {
									await router.navigate({
										to: "/o/$orgSlug/t/$tenantSlug/e/$eventSlug/settings",
										params: { ...params, eventSlug: newSlug },
									});
								}
								return ok;
							}}
						/>
					</Section>
				)}
				{canManageEvent && (
					<Section
						id="event-settings-positions-toggle"
						title={t("settings.positionsToggleTitle")}
						description={t("settings.positionsToggleDescription")}
					>
						<PositionsToggle
							scope={params}
							value={eventContext.positionsOverride}
							inherited={eventContext.inheritedPositionsEnabled}
							inheritLabel={t("settings.sameAsTenant")}
							run={run}
						/>
					</Section>
				)}
				{canManagePositions && (
					<Section
						id="event-settings-positions"
						title={t("settings.eventPositionsTitle")}
						description={t("settings.eventPositionsDescription")}
					>
						{!eventContext.positionsEnabled && (
							<Alert tone="info">{t("settings.eventPositionsUnused")}</Alert>
						)}
						<PositionsEditor scope={params} positions={positions} run={run} />
					</Section>
				)}
				{assignments && (
					<Section
						id="event-settings-roles"
						title={t("settings.eventRolesTitle")}
						description={t("settings.eventRolesDescription")}
					>
						<ScopedRolesEditor
							scope={params}
							assignments={assignments}
							run={run}
						/>
					</Section>
				)}
				{canManageEvent && (
					<Section
						id="event-settings-delete"
						title={t("settings.eventDeleteTitle")}
						description={t("settings.eventDeleteDescription")}
					>
						<div>
							<ConfirmButton
								label={t("settings.eventDelete")}
								confirmLabel={t("settings.eventDeleteConfirm")}
								onConfirm={async () => {
									const ok = await run(() => removeEvent({ data: params }));
									if (ok) {
										await router.navigate({
											to: "/o/$orgSlug/t/$tenantSlug/events",
											params: {
												orgSlug: params.orgSlug,
												tenantSlug: params.tenantSlug,
											},
										});
									}
								}}
							/>
						</div>
					</Section>
				)}
			</div>
			{!canManageEvent && !canManagePositions && !assignments && (
				<Alert tone="info">{t("settings.eventNoPermission")}</Alert>
			)}
		</main>
	);
}
