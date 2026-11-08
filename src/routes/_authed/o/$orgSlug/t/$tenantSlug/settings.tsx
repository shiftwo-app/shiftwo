import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import ErrorList from "../../../../../../components/manage/ErrorList";
import PositionsEditor from "../../../../../../components/manage/PositionsEditor";
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
		<main className="mx-auto max-w-3xl space-y-8 p-4">
			<h1 className="text-xl font-bold">テナントの設定</h1>
			<ErrorList errors={errors} />
			{canManageTenant && (
				<section className="space-y-3">
					<h2 className="text-lg font-semibold">テナント</h2>
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
				</section>
			)}
			{canManagePositions && (
				<section className="space-y-3">
					<h2 className="text-lg font-semibold">日常シフトの持ち場</h2>
					<p className="text-sm text-gray-600">
						イベントの持ち場は、イベントの設定で別に決めます。
					</p>
					<PositionsEditor scope={scope} positions={positions} run={run} />
				</section>
			)}
			{assignments && (
				<section className="space-y-3">
					<h2 className="text-lg font-semibold">
						このテナントでのロールの割り当て
					</h2>
					<p className="text-sm text-gray-600">
						ここで割り当てたロールの、シフトに関わる権限（シフトの閲覧・編集・確定、持ち場・イベントの管理）が、
						このテナントとその下のイベントで上乗せされます（店長など）。
					</p>
					<ScopedRolesEditor
						scope={scope}
						assignments={assignments}
						run={run}
					/>
				</section>
			)}
			{!canManageTenant && !canManagePositions && !assignments && (
				<p className="text-sm">このテナントの設定を変える権限がありません。</p>
			)}
		</main>
	);
}
