import { createFileRoute, Link } from "@tanstack/react-router";
import { memberRoleLabel } from "../../lib/org/member-label";
import { listMyOrganizations } from "../../server/org.functions";

// ログイン後のトップ：所属している団体の一覧
export const Route = createFileRoute("/_authed/")({
	loader: () => listMyOrganizations(),
	head: () => ({ meta: [{ title: "団体 | shiftwo" }] }),
	component: OrgListPage,
});

function OrgListPage() {
	const organizations = Route.useLoaderData();
	const button = "rounded border px-4 py-2 text-sm font-semibold";
	return (
		<main className="mx-auto max-w-2xl space-y-6 p-6">
			<h1 className="text-2xl font-bold">団体</h1>
			{organizations.length === 0 ? (
				<p className="text-sm">
					まだどの団体にも所属していません。団体を作るか、招待コードで参加してください。
				</p>
			) : (
				<ul className="divide-y rounded border">
					{organizations.map((org) => (
						<li key={org.slug}>
							<Link
								to="/o/$orgSlug"
								params={{ orgSlug: org.slug }}
								className="flex items-center justify-between px-4 py-3 hover:bg-gray-50"
							>
								<span className="font-semibold">
									{org.name}
									{org.suspended && (
										<span className="ml-2 rounded bg-amber-100 px-2 py-0.5 text-xs font-normal text-amber-800">
											Discord サーバーの条件で見られません
										</span>
									)}
								</span>
								<span className="text-xs text-gray-600">
									{org.displayName}（{memberRoleLabel(org)}）
								</span>
							</Link>
						</li>
					))}
				</ul>
			)}
			<div className="flex flex-wrap gap-3">
				<Link
					to="/join"
					search={{ code: "" }}
					className={`${button} bg-blue-600 text-white`}
				>
					招待コードで参加
				</Link>
				<Link to="/orgs/new" className={button}>
					団体を作る
				</Link>
			</div>
		</main>
	);
}
