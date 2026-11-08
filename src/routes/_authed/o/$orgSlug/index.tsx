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
		<main className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
			<div className="max-w-3xl space-y-4">
				<h1 className="text-xl leading-tight font-bold tracking-tight text-ink">
					テナント
				</h1>
				{tenants.length === 0 ? (
					<p className="rounded-lg border border-dashed border-line-strong px-4 py-6 text-center text-sm text-ink-muted">
						テナントがありません。
					</p>
				) : (
					<ul className="divide-y divide-line overflow-hidden rounded-lg border border-line bg-surface">
						{tenants.map((tenant) => (
							<li key={tenant.slug}>
								<Link
									to="/o/$orgSlug/t/$tenantSlug"
									params={{
										orgSlug: organization.slug,
										tenantSlug: tenant.slug,
									}}
									className="block px-4 py-3.5 font-bold text-ink transition-colors hover:bg-surface-sunken"
								>
									{tenant.name}
								</Link>
							</li>
						))}
					</ul>
				)}
			</div>
		</main>
	);
}
