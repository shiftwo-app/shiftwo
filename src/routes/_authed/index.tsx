import { createFileRoute, Link } from "@tanstack/react-router";
import Badge from "../../components/ui/Badge";
import { buttonClass } from "../../components/ui/Button";
import PageHeader from "../../components/ui/PageHeader";
import { memberRoleLabel } from "../../lib/org/member-label";
import { listMyOrganizations } from "../../server/org.functions";

// ログイン後のトップ：所属している団体の一覧
export const Route = createFileRoute("/_authed/")({
	loader: () => listMyOrganizations(),
	head: () => ({ meta: [{ title: "団体 | シフトヲ" }] }),
	component: OrgListPage,
});

function OrgListPage() {
	const organizations = Route.useLoaderData();
	return (
		<main className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
			<PageHeader
				title="団体"
				actions={
					<>
						<Link to="/orgs/new" className={buttonClass("primary")}>
							団体を作る
						</Link>
						<Link
							to="/join"
							search={{ code: "" }}
							className={buttonClass("secondary")}
						>
							招待コードで参加
						</Link>
					</>
				}
			/>
			{organizations.length === 0 ? (
				<div className="rounded-lg border border-dashed border-line-strong px-6 py-10 text-center">
					<p className="text-base font-bold text-ink">
						まだどの団体にも所属していません
					</p>
					<p className="mt-2 text-sm leading-relaxed text-ink-muted">
						団体を作るか、招待コードで参加してください。
					</p>
					<div className="mt-6 flex flex-wrap justify-center gap-2">
						<Link to="/orgs/new" className={buttonClass("primary")}>
							団体を作る
						</Link>
						<Link
							to="/join"
							search={{ code: "" }}
							className={buttonClass("secondary")}
						>
							招待コードで参加
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
										<Badge tone="warn">
											Discord サーバーの条件で見られません
										</Badge>
									)}
								</span>
								<span className="text-xs text-ink-muted">
									{org.displayName}（{memberRoleLabel(org)}）
								</span>
							</Link>
						</li>
					))}
				</ul>
			)}
		</main>
	);
}
