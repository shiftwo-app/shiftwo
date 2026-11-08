import { createFileRoute, Link } from "@tanstack/react-router";
import Badge from "../../components/ui/Badge";
import { buttonClass } from "../../components/ui/Button";
import PageHeader from "../../components/ui/PageHeader";
import { useT } from "../../lib/i18n/react";
import { translate } from "../../lib/i18n/translate";
import { memberRoleLabel } from "../../lib/org/member-label";
import { listMyOrganizations } from "../../server/org.functions";

// ログイン後のトップ：所属している団体の一覧
export const Route = createFileRoute("/_authed/")({
	loader: () => listMyOrganizations(),
	head: ({ match }) => ({
		meta: [
			{
				title: translate(match.context.locale, "shell.pageTitle", {
					page: translate(match.context.locale, "orgs.listTitle"),
				}),
			},
		],
	}),
	component: OrgListPage,
});

function OrgListPage() {
	const organizations = Route.useLoaderData();
	const t = useT();
	return (
		<main className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
			<PageHeader
				title={t("orgs.listTitle")}
				actions={
					<>
						<Link to="/orgs/new" className={buttonClass("primary")}>
							{t("orgs.create")}
						</Link>
						<Link
							to="/join"
							search={{ code: "" }}
							className={buttonClass("secondary")}
						>
							{t("orgs.joinWithCode")}
						</Link>
					</>
				}
			/>
			{organizations.length === 0 ? (
				<div className="rounded-lg border border-dashed border-line-strong px-6 py-10 text-center">
					<p className="text-base font-bold text-ink">{t("orgs.emptyTitle")}</p>
					<p className="mt-2 text-sm leading-relaxed text-ink-muted">
						{t("orgs.emptyBody")}
					</p>
					<div className="mt-6 flex flex-wrap justify-center gap-2">
						<Link to="/orgs/new" className={buttonClass("primary")}>
							{t("orgs.create")}
						</Link>
						<Link
							to="/join"
							search={{ code: "" }}
							className={buttonClass("secondary")}
						>
							{t("orgs.joinWithCode")}
						</Link>
					</div>
				</div>
			) : (
				<ul className="divide-y divide-line overflow-hidden rounded-lg border border-line bg-surface">
					{organizations.map((org) => (
						<li key={org.slug}>
							<Link
								to="/o/$orgSlug"
								params={{ orgSlug: org.slug }}
								className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 px-4 py-3.5 transition-colors hover:bg-surface-sunken"
							>
								<span className="flex flex-wrap items-center gap-2">
									<span className="font-bold text-ink">{org.name}</span>
									{org.suspended && (
										<Badge tone="warn">{t("orgs.suspendedBadge")}</Badge>
									)}
								</span>
								<span className="text-xs text-ink-muted">
									{t("shell.memberWithRole", {
										name: org.displayName,
										role: memberRoleLabel(org, t),
									})}
								</span>
							</Link>
						</li>
					))}
				</ul>
			)}
		</main>
	);
}
