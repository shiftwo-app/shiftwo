import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import ConfirmButton from "../../../../../../../../components/manage/ConfirmButton";
import ErrorList from "../../../../../../../../components/manage/ErrorList";
import Alert from "../../../../../../../../components/ui/Alert";
import PageHeader from "../../../../../../../../components/ui/PageHeader";
import Section from "../../../../../../../../components/ui/Section";
import PositionsEditor from "../../../../../../../../components/manage/PositionsEditor";
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
			<PageHeader title="イベントの設定" />
			<ErrorList errors={errors} className="mb-6" />
			<div>
				{canManageEvent && (
					<Section id="event-settings-basic" title="イベント">
						<TenantOrEventForm
							kind="event"
							initial={event}
							submitLabel="保存"
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
				{canManagePositions && (
					<Section
						id="event-settings-positions"
						title="このイベントの持ち場"
						description="日常シフトの持ち場とは別に持ちます。"
					>
						<PositionsEditor scope={params} positions={positions} run={run} />
					</Section>
				)}
				{assignments && (
					<Section
						id="event-settings-roles"
						title="このイベントでのロールの割り当て"
						description="ここで割り当てたロールの、シフトに関わる権限が、このイベントだけで上乗せされます。"
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
						title="イベントを消す"
						description="イベントの持ち場とシフトも消えます。元に戻せません。"
					>
						<div>
							<ConfirmButton
								label="このイベントを消す"
								confirmLabel="本当に消す（イベントの持ち場とシフトも消えます）"
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
				<Alert tone="info">このイベントの設定を変える権限がありません。</Alert>
			)}
		</main>
	);
}
