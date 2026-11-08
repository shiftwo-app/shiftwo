import { createFileRoute, Link, redirect } from "@tanstack/react-router";

// 団体のトップ。テナントが 1 つなら、テナントを選ぶ手順は出さずにそのテナントへ
export const Route = createFileRoute("/_authed/o/$orgSlug/")({
	beforeLoad: ({ context, params }) => {
		if (context.tenants.length === 1) {
			throw redirect({
				to: "/o/$orgSlug/t/$tenantSlug",
				params: {
					orgSlug: params.orgSlug,
					tenantSlug: context.tenants[0].slug,
				},
			});
		}
	},
	component: TenantListPage,
});

function TenantListPage() {
	const { organization, tenants } = Route.useRouteContext();
	return (
		<main className="mx-auto max-w-2xl space-y-4 p-6">
			<h1 className="text-xl font-bold">テナント</h1>
			{tenants.length === 0 ? (
				<p className="text-sm">テナントがありません。</p>
			) : (
				<ul className="divide-y rounded border">
					{tenants.map((tenant) => (
						<li key={tenant.slug}>
							<Link
								to="/o/$orgSlug/t/$tenantSlug"
								params={{ orgSlug: organization.slug, tenantSlug: tenant.slug }}
								className="block px-4 py-3 font-semibold hover:bg-gray-50"
							>
								{tenant.name}
							</Link>
						</li>
					))}
				</ul>
			)}
		</main>
	);
}
