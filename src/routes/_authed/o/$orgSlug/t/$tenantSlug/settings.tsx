import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import ErrorList from "../../../../../../components/manage/ErrorList";
import Alert from "../../../../../../components/ui/Alert";
import PageHeader from "../../../../../../components/ui/PageHeader";
import Section from "../../../../../../components/ui/Section";
import PositionsEditor from "../../../../../../components/manage/PositionsEditor";
import PositionsToggle from "../../../../../../components/manage/PositionsToggle";
import ScopedRolesEditor from "../../../../../../components/manage/ScopedRolesEditor";
import TenantOrEventForm from "../../../../../../components/manage/TenantOrEventForm";
import { useMutationRunner } from "../../../../../../components/manage/useMutationRunner";
import { hasPermission } from "../../../../../../lib/org/permissions";
import {
	getScopedRoleAssignments,
	updateTenantFn,
} from "../../../../../../server/manage.functions";
import { getShiftBoard } from "../../../../../../server/shifts.functions";
import { ShiftStatus } from "../../../../../../types";

// テナントの設定：名前・URL 名・時間粒度、日常シフトの持ち場、テナントでのロールの割り当て
export const Route = createFileRoute(
	"/_authed/o/$orgSlug/t/$tenantSlug/settings",
)({
	loader: async ({ params, context }) => {
		const scope = { orgSlug: params.orgSlug, tenantSlug: params.tenantSlug };
		const [board, assignments] = await Promise.all([
			getShiftBoard({ data: { ...scope, status: ShiftStatus.confirmed } }),
			hasPermission(context.member.permissions, "member.manage")
				? getScopedRoleAssignments({ data: scope })
				: Promise.resolve(null),
		]);
		return { positions: board.positions, assignments };
	},
	component: TenantSettingsPage,
});

function TenantSettingsPage() {
	const { member, tenantContext } = Route.useRouteContext();
	const { positions, assignments } = Route.useLoaderData();
	const params = Route.useParams();
	const router = useRouter();
	const updateTenant = useServerFn(updateTenantFn);
	const { run, errors } = useMutationRunner();
	const scope = { orgSlug: params.orgSlug, tenantSlug: params.tenantSlug };
	const tenant = tenantContext.tenant;
	const canManageTenant = hasPermission(member.permissions, "tenant.manage");
	const canManagePositions = hasPermission(
		tenantContext.permissions,
		"position.manage",
	);

	return (
		<main className="mx-auto max-w-5xl px-4 py-6 sm:px-6">
			<PageHeader title="テナントの設定" />
			<ErrorList errors={errors} className="mb-6" />
			<div>
				{canManageTenant && (
					<Section id="tenant-settings-basic" title="テナント">
						<TenantOrEventForm
							kind="tenant"
							initial={tenant}
							submitLabel="保存"
							onSubmit={async (value) => {
								let newSlug: string | null = null;
								const ok = await run(async () => {
									const result = await updateTenant({
										data: {
											...scope,
											tenant: {
												...value,
												timeUnitMinutes: value.timeUnitMinutes ?? 15,
											},
										},
									});
									if (result.ok) newSlug = result.slug;
									return result;
								});
								// URL 名を変えたら、新しい URL へ
								if (ok && newSlug && newSlug !== tenant.slug) {
									await router.navigate({
										to: "/o/$orgSlug/t/$tenantSlug/settings",
										params: { orgSlug: params.orgSlug, tenantSlug: newSlug },
									});
								}
								return ok;
							}}
						/>
					</Section>
				)}
				{canManageTenant && (
					<Section
						id="tenant-settings-positions-toggle"
						title="持ち場を使うか"
						description="使わないときは、シフトを人と時間だけで組みます（持ち場の選択・持ち場別の表示・必要な人数・希望の持ち場を出しません）。"
					>
						<PositionsToggle
							scope={scope}
							value={tenantContext.positionsOverride}
							inherited={tenantContext.organizationPositionsEnabled}
							inheritLabel="団体と同じ"
							run={run}
						/>
					</Section>
				)}
				{canManagePositions && (
					<Section
						id="tenant-settings-positions"
						title="日常シフトの持ち場"
						description="イベントの持ち場は、イベントの設定で別に決めます。"
					>
						{!tenantContext.positionsEnabled && (
							<Alert tone="info">
								このテナントでは持ち場を使っていません。使うようにすると、ここで決めた持ち場を使えます。
							</Alert>
						)}
						<PositionsEditor scope={scope} positions={positions} run={run} />
					</Section>
				)}
				{assignments && (
					<Section
						id="tenant-settings-roles"
						title="このテナントでのロールの割り当て"
						description="ここで割り当てたロールの、シフトに関わる権限（シフトの閲覧・編集・確定、持ち場・イベントの管理）が、このテナントとその下のイベントで上乗せされます（店長など）。"
					>
						<ScopedRolesEditor
							scope={scope}
							assignments={assignments}
							run={run}
						/>
					</Section>
				)}
			</div>
			{!canManageTenant && !canManagePositions && !assignments && (
				<Alert tone="info">このテナントの設定を変える権限がありません。</Alert>
			)}
		</main>
	);
}
