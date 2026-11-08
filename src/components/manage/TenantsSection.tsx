import { Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useId } from "react";
import { createTenantFn } from "../../server/manage.functions";
import { buttonClass } from "../ui/Button";
import Section from "../ui/Section";
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
	const id = useId();
	return (
		<Section
			id={`${id}-h`}
			title={`テナント（${tenants.length}）`}
			description="店舗など、シフトを組む単位です。日常シフトの持ち場やイベントは、テナントごとに持ちます。"
		>
			{tenants.length > 0 && (
				<ul className="divide-y divide-line overflow-hidden rounded-lg border border-line bg-surface text-sm">
					{tenants.map((tenant) => (
						<li
							key={tenant.slug}
							className="flex items-center justify-between gap-3 px-4 py-2.5"
						>
							<span className="min-w-0">
								<span className="block truncate font-bold text-ink">
									{tenant.name}
								</span>
								<span className="block truncate text-xs text-ink-muted">
									{tenant.slug}
								</span>
							</span>
							<Link
								to="/o/$orgSlug/t/$tenantSlug/settings"
								params={{ orgSlug, tenantSlug: tenant.slug }}
								className={buttonClass("ghost", "sm")}
							>
								設定
							</Link>
						</li>
					))}
				</ul>
			)}
			<div className="space-y-3 rounded-lg border border-dashed border-line-strong p-4">
				<h3 className="text-sm font-bold text-ink">
					テナントを作る（店舗など）
				</h3>
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
		</Section>
	);
};

export default TenantsSection;
