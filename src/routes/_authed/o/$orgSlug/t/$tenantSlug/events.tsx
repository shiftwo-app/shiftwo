import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import ErrorList from "../../../../../../components/manage/ErrorList";
import PageHeader from "../../../../../../components/ui/PageHeader";
import Section from "../../../../../../components/ui/Section";
import TenantOrEventForm from "../../../../../../components/manage/TenantOrEventForm";
import { useMutationRunner } from "../../../../../../components/manage/useMutationRunner";
import { hasPermission } from "../../../../../../lib/org/permissions";
import { createEventFn } from "../../../../../../server/manage.functions";
import { useT } from "../../../../../../lib/i18n/react";

// テナントのイベントの一覧と、イベントの作成（イベントの管理の権限があるとき）
export const Route = createFileRoute(
	"/_authed/o/$orgSlug/t/$tenantSlug/events",
)({
	component: EventsPage,
});

function EventsPage() {
	const { organization, tenantContext } = Route.useRouteContext();
	const router = useRouter();
	const t = useT();
	const createEvent = useServerFn(createEventFn);
	const { run, errors } = useMutationRunner();
	const params = {
		orgSlug: organization.slug,
		tenantSlug: tenantContext.tenant.slug,
	};
	const canManage = hasPermission(tenantContext.permissions, "event.manage");

	return (
		<main className="mx-auto max-w-5xl px-4 py-6 sm:px-6">
			<PageHeader
				title={t("settings.eventsTitle")}
				description={t("settings.eventsDescription")}
			/>
			<div>
				<Section
					id="events-list"
					title={t("settings.eventsListTitle", {
						count: tenantContext.events.length,
					})}
				>
					{tenantContext.events.length === 0 ? (
						<p className="text-sm text-ink-muted">
							{t("settings.eventsEmpty")}
						</p>
					) : (
						<ul className="divide-y divide-line overflow-hidden rounded-lg border border-line bg-surface">
							{tenantContext.events.map((event) => (
								<li key={event.slug}>
									<Link
										to="/o/$orgSlug/t/$tenantSlug/e/$eventSlug"
										params={{ ...params, eventSlug: event.slug }}
										className="flex items-center justify-between gap-3 px-4 py-3 hover:bg-surface-sunken"
									>
										<span className="min-w-0">
											<span className="block truncate text-sm font-bold text-ink">
												{event.name}
											</span>
											<span className="block truncate text-xs text-ink-muted">
												{event.slug}
											</span>
										</span>
										<span
											aria-hidden="true"
											className="shrink-0 text-ink-muted"
										>
											›
										</span>
									</Link>
								</li>
							))}
						</ul>
					)}
				</Section>
				{canManage && (
					<Section id="events-create" title={t("settings.eventsCreate")}>
						<ErrorList errors={errors} />
						<TenantOrEventForm
							kind="event"
							submitLabel={t("settings.create")}
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
					</Section>
				)}
			</div>
		</main>
	);
}
