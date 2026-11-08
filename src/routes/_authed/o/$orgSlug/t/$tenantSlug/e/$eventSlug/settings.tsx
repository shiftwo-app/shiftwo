import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import ConfirmButton from "../../../../../../../../components/manage/ConfirmButton";
import ErrorList from "../../../../../../../../components/manage/ErrorList";
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
		<main className="mx-auto max-w-3xl space-y-8 p-4">
			<h1 className="text-xl font-bold">イベントの設定</h1>
			<ErrorList errors={errors} />
			{canManageEvent && (
				<section className="space-y-3">
					<h2 className="text-lg font-semibold">イベント</h2>
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
				</section>
			)}
			{canManagePositions && (
				<section className="space-y-3">
					<h2 className="text-lg font-semibold">このイベントの持ち場</h2>
					<p className="text-sm text-gray-600">
						日常シフトの持ち場とは別に持ちます。
					</p>
					<PositionsEditor scope={params} positions={positions} run={run} />
				</section>
			)}
			{assignments && (
				<section className="space-y-3">
					<h2 className="text-lg font-semibold">
						このイベントでのロールの割り当て
					</h2>
					<p className="text-sm text-gray-600">
						ここで割り当てたロールの、シフトに関わる権限が、このイベントだけで上乗せされます。
					</p>
					<ScopedRolesEditor
						scope={params}
						assignments={assignments}
						run={run}
					/>
				</section>
			)}
			{canManageEvent && (
				<section className="space-y-3">
					<h2 className="text-lg font-semibold">イベントを消す</h2>
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
				</section>
			)}
			{!canManageEvent && !canManagePositions && !assignments && (
				<p className="text-sm">このイベントの設定を変える権限がありません。</p>
			)}
		</main>
	);
}
