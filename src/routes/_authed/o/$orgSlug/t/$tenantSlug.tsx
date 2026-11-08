import {
	createFileRoute,
	Link,
	notFound,
	Outlet,
} from "@tanstack/react-router";
import { hasPermission } from "../../../../../lib/org/permissions";
import { getTenantContext } from "../../../../../server/shifts.functions";

// テナントの画面の土台。テナントがその団体にない・所属していなければ「見つかりません」
export const Route = createFileRoute("/_authed/o/$orgSlug/t/$tenantSlug")({
	beforeLoad: async ({ params }) => {
		const tenant = await getTenantContext({
			data: { orgSlug: params.orgSlug, tenantSlug: params.tenantSlug },
		});
		if (!tenant) throw notFound();
		return { tenantContext: tenant };
	},
	component: TenantLayout,
});

function TenantLayout() {
	const { organization, tenants, tenantContext, member } =
		Route.useRouteContext();
	// 設定に何か変えられるものがあるときだけ、設定へのリンクを出す（守りはサーバー側）
	const canOpenSettings =
		hasPermission(member.permissions, "tenant.manage") ||
		hasPermission(member.permissions, "member.manage") ||
		hasPermission(tenantContext.permissions, "position.manage");
	const params = {
		orgSlug: organization.slug,
		tenantSlug: tenantContext.tenant.slug,
	};
	const link = "rounded px-3 py-1 text-sm hover:bg-gray-100";
	const active = { className: `${link} bg-gray-200 font-semibold` };
	return (
		<div>
			<nav
				aria-label={`${tenantContext.tenant.name}のメニュー`}
				className="flex flex-wrap items-center gap-2 border-b bg-gray-50 px-4 py-2"
			>
				{/* テナントが 1 つなら、テナント名は出さない（団体名で足りる） */}
				{tenants.length > 1 && (
					<span className="mr-2 font-semibold">
						{tenantContext.tenant.name}
					</span>
				)}
				<Link
					to="/o/$orgSlug/t/$tenantSlug"
					params={params}
					activeOptions={{ exact: true }}
					activeProps={active}
					className={link}
				>
					日常シフト
				</Link>
				<Link
					to="/o/$orgSlug/t/$tenantSlug/draft"
					params={params}
					activeProps={active}
					className={link}
				>
					日常シフトの下書き
				</Link>
				<Link
					to="/o/$orgSlug/t/$tenantSlug/events"
					params={params}
					activeProps={active}
					className={link}
				>
					イベント（{tenantContext.events.length}）
				</Link>
				{canOpenSettings && (
					<Link
						to="/o/$orgSlug/t/$tenantSlug/settings"
						params={params}
						activeProps={active}
						className={link}
					>
						テナントの設定
					</Link>
				)}
				<span className="ml-auto text-xs text-gray-600">
					{tenantContext.canEditShifts
						? "このテナントのシフトを編集できます"
						: "閲覧のみ"}
				</span>
			</nav>
			<Outlet />
		</div>
	);
}
