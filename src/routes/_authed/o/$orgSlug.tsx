import {
	createFileRoute,
	Link,
	notFound,
	Outlet,
} from "@tanstack/react-router";
import { memberRoleLabel } from "../../../lib/org/member-label";
import { getOrganization } from "../../../server/org.functions";

// 団体の画面の土台。ここで一度だけメンバーかを確かめ、所属していなければ「見つかりません」にする
// （団体があるかどうかも漏らさない）。データの守りは、server function 側でも毎回確かめる
export const Route = createFileRoute("/_authed/o/$orgSlug")({
	beforeLoad: async ({ params }) => {
		const org = await getOrganization({ data: { orgSlug: params.orgSlug } });
		if (!org) throw notFound();
		return org;
	},
	head: ({ match }) => ({
		meta: [
			{ title: `${match.context.organization?.name ?? "団体"} | shiftwo` },
		],
	}),
	component: OrgLayout,
});

function OrgLayout() {
	const { organization, member, tenants } = Route.useRouteContext();
	const link = "rounded px-3 py-1 text-sm hover:bg-gray-100";
	const active = { className: `${link} bg-gray-200 font-semibold` };
	return (
		<div>
			<nav
				aria-label={`${organization.name}のメニュー`}
				className="flex flex-wrap items-center gap-2 border-b px-4 py-2"
			>
				<Link
					to="/o/$orgSlug"
					params={{ orgSlug: organization.slug }}
					className="mr-2 font-semibold"
				>
					{organization.name}
				</Link>
				{/* テナントが 1 つなら、テナントを選ぶ手順は出さない */}
				{tenants.length > 1 &&
					tenants.map((tenant) => (
						<Link
							key={tenant.slug}
							to="/o/$orgSlug/t/$tenantSlug"
							params={{ orgSlug: organization.slug, tenantSlug: tenant.slug }}
							activeProps={active}
							className={link}
						>
							{tenant.name}
						</Link>
					))}
				<Link
					to="/o/$orgSlug/settings"
					params={{ orgSlug: organization.slug }}
					activeProps={active}
					className={link}
				>
					設定・メンバー
				</Link>
				<span className="ml-auto text-xs text-gray-600">
					{member.displayName}（{memberRoleLabel(member)}）
				</span>
			</nav>
			<Outlet />
		</div>
	);
}
