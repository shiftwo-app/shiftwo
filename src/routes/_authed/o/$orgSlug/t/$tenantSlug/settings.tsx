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
import { useT } from "../../../../../../lib/i18n/react";

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
	const t = useT();
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
			<PageHeader title={t("settings.tenantSettingsTitle")} />
			<ErrorList errors={errors} className="mb-6" />
			<div>
				{canManageTenant && (
					<Section
						id="tenant-settings-basic"
						title={t("settings.tenantSection")}
					>
						<TenantOrEventForm
							kind="tenant"
							initial={tenant}
							submitLabel={t("common.save")}
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
						title={t("settings.positionsToggleTitle")}
						description={t("settings.positionsToggleDescription")}
					>
						<PositionsToggle
							scope={scope}
							value={tenantContext.positionsOverride}
							inherited={tenantContext.organizationPositionsEnabled}
							inheritLabel={t("settings.sameAsOrg")}
							run={run}
						/>
					</Section>
				)}
				{canManagePositions && (
					<Section
						id="tenant-settings-positions"
						title={t("settings.tenantPositionsTitle")}
						description={t("settings.tenantPositionsDescription")}
					>
						{!tenantContext.positionsEnabled && (
							<Alert tone="info">{t("settings.tenantPositionsUnused")}</Alert>
						)}
						<PositionsEditor scope={scope} positions={positions} run={run} />
					</Section>
				)}
				{assignments && (
					<Section
						id="tenant-settings-roles"
						title={t("settings.tenantRolesTitle")}
						description={t("settings.tenantRolesDescription")}
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
				<Alert tone="info">{t("settings.tenantNoPermission")}</Alert>
			)}
		</main>
	);
}
