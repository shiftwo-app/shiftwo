import { createFileRoute, Link } from "@tanstack/react-router";

// テナントのイベントの一覧（作成・編集の画面は次の PR で）
export const Route = createFileRoute(
	"/_authed/o/$orgSlug/t/$tenantSlug/events",
)({
	component: EventsPage,
});

function EventsPage() {
	const { organization, tenantContext } = Route.useRouteContext();
	return (
		<main className="mx-auto max-w-2xl space-y-4 p-6">
			<h1 className="text-xl font-bold">イベント</h1>
			<p className="text-sm text-gray-600">
				単発のイベントのシフトは、日常シフトとは別に、イベントごとの役割で組みます。
			</p>
			{tenantContext.events.length === 0 ? (
				<p className="text-sm">まだイベントはありません。</p>
			) : (
				<ul className="divide-y rounded border">
					{tenantContext.events.map((event) => (
						<li key={event.slug}>
							<Link
								to="/o/$orgSlug/t/$tenantSlug/e/$eventSlug"
								params={{
									orgSlug: organization.slug,
									tenantSlug: tenantContext.tenant.slug,
									eventSlug: event.slug,
								}}
								className="block px-4 py-3 font-semibold hover:bg-gray-50"
							>
								{event.name}
							</Link>
						</li>
					))}
				</ul>
			)}
		</main>
	);
}
