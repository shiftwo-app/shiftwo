import { createFileRoute, notFound, Outlet } from "@tanstack/react-router";
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

// メニュー（パンくずとタブ）は、団体の画面の土台（$orgSlug.tsx）がまとめて出す
function TenantLayout() {
	return <Outlet />;
}
