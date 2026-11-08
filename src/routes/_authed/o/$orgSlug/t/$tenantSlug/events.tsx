import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import ErrorList from "../../../../../../components/manage/ErrorList";
import TenantOrEventForm from "../../../../../../components/manage/TenantOrEventForm";
import { useMutationRunner } from "../../../../../../components/manage/useMutationRunner";
import { hasPermission } from "../../../../../../lib/org/permissions";
import { createEventFn } from "../../../../../../server/manage.functions";

// テナントのイベントの一覧と、イベントの作成（イベントの管理の権限があるとき）
export const Route = createFileRoute(
	"/_authed/o/$orgSlug/t/$tenantSlug/events",
)({
	component: EventsPage,
});

function EventsPage() {
	const { organization, tenantContext } = Route.useRouteContext();
	const router = useRouter();
	const createEvent = useServerFn(createEventFn);
	const { run, errors } = useMutationRunner();
	const params = {
		orgSlug: organization.slug,
		tenantSlug: tenantContext.tenant.slug,
	};
	const canManage = hasPermission(tenantContext.permissions, "event.manage");

	return (
		<main className="mx-auto max-w-2xl space-y-4 p-6">
			<h1 className="text-xl font-bold">イベント</h1>
			<p className="text-sm text-gray-600">
				単発のイベントのシフトは、日常シフトとは別に、イベントごとの持ち場で組みます。
			</p>
			{tenantContext.events.length === 0 ? (
				<p className="text-sm">まだイベントはありません。</p>
			) : (
				<ul className="divide-y rounded border">
					{tenantContext.events.map((event) => (
						<li key={event.slug}>
							<Link
								to="/o/$orgSlug/t/$tenantSlug/e/$eventSlug"
								params={{ ...params, eventSlug: event.slug }}
								className="block px-4 py-3 font-semibold hover:bg-gray-50"
							>
								{event.name}
							</Link>
						</li>
					))}
				</ul>
			)}
			{canManage && (
				<section className="space-y-2 rounded border p-3">
					<h2 className="font-semibold">イベントを作る</h2>
					<ErrorList errors={errors} />
					<TenantOrEventForm
						kind="event"
						submitLabel="作る"
						onSubmit={async (value) => {
							let slug: string | null = null;
							const ok = await run(async () => {
								const result = await createEvent({
									data: { ...params, event: value },
								});
								if (result.ok) slug = result.slug;
								return result;
							});
							if (ok && slug) {
								await router.navigate({
									to: "/o/$orgSlug/t/$tenantSlug/e/$eventSlug/settings",
									params: { ...params, eventSlug: slug },
								});
							}
							return ok;
						}}
					/>
				</section>
			)}
		</main>
	);
}
