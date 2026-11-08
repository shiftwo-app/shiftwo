import { Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { createTenantFn } from "../../server/manage.functions";
import TenantOrEventForm from "./TenantOrEventForm";
import type { RunMutation } from "./useMutationRunner";

/** 団体の設定のテナントの欄：一覧（各テナントの設定へ）と、テナントの作成 */
const TenantsSection = ({
	orgSlug,
	tenants,
	run,
}: {
	orgSlug: string;
	tenants: { slug: string; name: string }[];
	run: RunMutation;
}) => {
	const createTenant = useServerFn(createTenantFn);
	return (
		<section className="space-y-3">
			<h2 className="text-lg font-semibold">テナント（{tenants.length}）</h2>
			<ul className="divide-y rounded border text-sm">
				{tenants.map((tenant) => (
					<li
						key={tenant.slug}
						className="flex items-center justify-between px-3 py-2"
					>
						<span className="font-semibold">{tenant.name}</span>
						<Link
							to="/o/$orgSlug/t/$tenantSlug/settings"
							params={{ orgSlug, tenantSlug: tenant.slug }}
							className="underline"
						>
							設定
						</Link>
					</li>
				))}
			</ul>
			<div className="space-y-2 rounded border border-dashed p-3">
				<h3 className="text-sm font-semibold">テナントを作る（店舗など）</h3>
				<TenantOrEventForm
					kind="tenant"
					submitLabel="作る"
					onSubmit={(value) =>
						run(() =>
							createTenant({
								data: {
									orgSlug,
									tenant: {
										...value,
										timeUnitMinutes: value.timeUnitMinutes ?? 15,
									},
								},
							}),
						)
					}
				/>
			</div>
		</section>
	);
};

export default TenantsSection;
