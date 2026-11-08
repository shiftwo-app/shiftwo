import {
	createFileRoute,
	Link,
	notFound,
	Outlet,
	redirect,
	useMatch,
} from "@tanstack/react-router";
import ScopeTabs, { type ScopeTab } from "../../../components/shell/ScopeTabs";
import { useT } from "../../../lib/i18n/react";
import { translate } from "../../../lib/i18n/translate";
import { memberRoleLabel } from "../../../lib/org/member-label";
import { hasPermission } from "../../../lib/org/permissions";
import { getOrganization } from "../../../server/org.functions";

// 団体の画面の土台。ここで一度だけメンバーかを確かめ、所属していなければ「見つかりません」にする
// （団体があるかどうかも漏らさない）。データの守りは、server function 側でも毎回確かめる
export const Route = createFileRoute("/_authed/o/$orgSlug")({
	beforeLoad: async ({ params }) => {
		const org = await getOrganization({ data: { orgSlug: params.orgSlug } });
		if (!org) throw notFound();
		// Discord サーバーを抜けて見られなくなっている本人は、理由のページへ
		if (org.status === "suspended") {
			throw redirect({
				to: "/suspended/$orgSlug",
				params: { orgSlug: params.orgSlug },
			});
		}
		return org;
	},
	head: ({ match }) => ({
		meta: [
			{
				title: translate(match.context.locale, "shell.pageTitle", {
					page:
						match.context.organization?.name ??
						translate(match.context.locale, "shell.orgFallbackName"),
				}),
			},
		],
	}),
	component: OrgLayout,
});

function OrgLayout() {
	const { organization, member, tenants } = Route.useRouteContext();
	const t = useT();
	// いま開いているテナント・イベント（その画面の土台の beforeLoad で確かめたもの）
	const tenantMatch = useMatch({
		from: "/_authed/o/$orgSlug/t/$tenantSlug",
		shouldThrow: false,
	});
	const eventMatch = useMatch({
		from: "/_authed/o/$orgSlug/t/$tenantSlug/e/$eventSlug",
		shouldThrow: false,
	});
	const tenantContext = tenantMatch?.context.tenantContext;
	const eventContext = eventMatch?.context.eventContext;
	const orgSlug = organization.slug;
	const tenantParams = tenantContext && {
		orgSlug,
		tenantSlug: tenantContext.tenant.slug,
	};

	// いちばん深い単位のタブ。設定のタブは、変えられるものがあるときだけ出す（守りはサーバー側）
	let tabs: ScopeTab[];
	let tabsLabel: string;
	if (eventContext && tenantParams) {
		const params = { ...tenantParams, eventSlug: eventContext.event.slug };
		const canOpenSettings =
			hasPermission(eventContext.permissions, "event.manage") ||
			hasPermission(eventContext.permissions, "position.manage") ||
			hasPermission(member.permissions, "member.manage");
		tabsLabel = t("shell.menuLabel", { name: eventContext.event.name });
		tabs = [
			{
				label: t("shell.tabPublished"),
				link: { to: "/o/$orgSlug/t/$tenantSlug/e/$eventSlug", params },
				exact: true,
			},
			{
				label: t("shell.tabDraft"),
				link: { to: "/o/$orgSlug/t/$tenantSlug/e/$eventSlug/draft", params },
			},
			{
				label: t("report.tab"),
				link: { to: "/o/$orgSlug/t/$tenantSlug/e/$eventSlug/report", params },
			},
			...(canOpenSettings
				? [
						{
							label: t("shell.tabEventSettings"),
							link: {
								to: "/o/$orgSlug/t/$tenantSlug/e/$eventSlug/settings",
								params,
							},
						} satisfies ScopeTab,
					]
				: []),
		];
	} else if (tenantContext && tenantParams) {
		const canOpenSettings =
			hasPermission(member.permissions, "tenant.manage") ||
			hasPermission(member.permissions, "member.manage") ||
			hasPermission(tenantContext.permissions, "position.manage");
		tabsLabel = t("shell.menuLabel", { name: tenantContext.tenant.name });
		tabs = [
			{
				label: t("shell.tabRegular"),
				link: { to: "/o/$orgSlug/t/$tenantSlug", params: tenantParams },
				exact: true,
			},
			{
				label: t("shell.tabDraft"),
				link: { to: "/o/$orgSlug/t/$tenantSlug/draft", params: tenantParams },
			},
			{
				label: t("report.tab"),
				link: { to: "/o/$orgSlug/t/$tenantSlug/report", params: tenantParams },
			},
			{
				label: t("shell.tabEvents", { count: tenantContext.events.length }),
				link: { to: "/o/$orgSlug/t/$tenantSlug/events", params: tenantParams },
			},
			...(canOpenSettings
				? [
						{
							label: t("shell.tabTenantSettings"),
							link: {
								to: "/o/$orgSlug/t/$tenantSlug/settings",
								params: tenantParams,
							},
						} satisfies ScopeTab,
					]
				: []),
		];
	} else {
		tabsLabel = t("shell.menuLabel", { name: organization.name });
		tabs = [
			{
				label: t("shell.tabTop"),
				link: { to: "/o/$orgSlug", params: { orgSlug } },
				exact: true,
			},
			...tenants.map(
				(tenant) =>
					({
						label: tenant.name,
						link: {
							to: "/o/$orgSlug/t/$tenantSlug",
							params: { orgSlug, tenantSlug: tenant.slug },
						},
					}) satisfies ScopeTab,
			),
			{
				label: t("shell.tabPreferences"),
				link: { to: "/o/$orgSlug/preferences", params: { orgSlug } },
			},
			{
				label: t("shell.tabSettingsMembers"),
				link: { to: "/o/$orgSlug/settings", params: { orgSlug } },
			},
		];
	}

	const crumb =
		"text-ink-muted hover:text-ink hover:underline underline-offset-4";
	return (
		<div>
			<div className="border-b border-line bg-surface">
				<div className="mx-auto max-w-7xl px-4 sm:px-6">
					<div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-2 pt-4">
						{/* いまどこにいるか（団体 › テナント › イベント）。最後の 1 つがいまの単位 */}
						<nav aria-label={t("shell.breadcrumbLabel")}>
							<ol className="flex flex-wrap items-center gap-x-2 text-sm">
								<li>
									{tenantContext ? (
										<Link
											to="/o/$orgSlug"
											params={{ orgSlug }}
											className={crumb}
										>
											{organization.name}
										</Link>
									) : (
										<span
											aria-current="page"
											className="text-lg font-bold text-ink"
										>
											{organization.name}
										</span>
									)}
								</li>
								{tenantContext && tenantParams && (
									<li className="flex items-center gap-x-2">
										<span aria-hidden="true" className="text-line-strong">
											/
										</span>
										{eventContext ? (
											<Link
												to="/o/$orgSlug/t/$tenantSlug"
												params={tenantParams}
												className={crumb}
											>
												{tenantContext.tenant.name}
											</Link>
										) : (
											<span
												aria-current="page"
												className="text-lg font-bold text-ink"
											>
												{tenantContext.tenant.name}
											</span>
										)}
									</li>
								)}
								{eventContext && (
									<li className="flex items-center gap-x-2">
										<span aria-hidden="true" className="text-line-strong">
											/
										</span>
										<span
											aria-current="page"
											className="text-lg font-bold text-ink"
										>
											{eventContext.event.name}
										</span>
									</li>
								)}
							</ol>
						</nav>
						{/* 団体全体のもの（どの画面からでも行けるように） */}
						<div className="flex items-center gap-4 text-sm">
							{tenantContext && (
								<>
									<Link
										to="/o/$orgSlug/preferences"
										params={{ orgSlug }}
										className={crumb}
									>
										{t("shell.tabPreferences")}
									</Link>
									<Link
										to="/o/$orgSlug/settings"
										params={{ orgSlug }}
										className={crumb}
									>
										{t("shell.tabSettingsMembers")}
									</Link>
								</>
							)}
							<span className="text-xs text-ink-muted">
								{t("shell.memberWithRole", {
									name: member.displayName,
									role: memberRoleLabel(member, t),
								})}
							</span>
						</div>
					</div>
					<div className="mt-2">
						<ScopeTabs label={tabsLabel} tabs={tabs} />
					</div>
				</div>
			</div>
			<Outlet />
		</div>
	);
}
