import {
	createFileRoute,
	Link,
	notFound,
	Outlet,
} from "@tanstack/react-router";
import { hasPermission } from "../../../../../../../lib/org/permissions";
import { getEventContext } from "../../../../../../../server/shifts.functions";

// イベントの画面の土台。イベントがそのテナントにない・所属していなければ「見つかりません」
export const Route = createFileRoute(
	"/_authed/o/$orgSlug/t/$tenantSlug/e/$eventSlug",
)({
	beforeLoad: async ({ params }) => {
		const event = await getEventContext({ data: params });
		if (!event) throw notFound();
		return { eventContext: event };
	},
	component: EventLayout,
});

function EventLayout() {
	const { eventContext, member } = Route.useRouteContext();
	const canOpenSettings =
		hasPermission(eventContext.permissions, "event.manage") ||
		hasPermission(eventContext.permissions, "position.manage") ||
		hasPermission(member.permissions, "member.manage");
	const params = Route.useParams();
	const link = "rounded px-3 py-1 text-sm hover:bg-gray-100";
	const active = { className: `${link} bg-gray-200 font-semibold` };
	return (
		<div>
			<nav
				aria-label={`${eventContext.event.name}のメニュー`}
				className="flex flex-wrap items-center gap-2 border-b px-4 py-2"
			>
				<span className="mr-2 font-semibold">
					イベント：{eventContext.event.name}
				</span>
				<Link
					to="/o/$orgSlug/t/$tenantSlug/e/$eventSlug"
					params={params}
					activeOptions={{ exact: true }}
					activeProps={active}
					className={link}
				>
					確定シフト
				</Link>
				<Link
					to="/o/$orgSlug/t/$tenantSlug/e/$eventSlug/draft"
					params={params}
					activeProps={active}
					className={link}
				>
					下書き
				</Link>
				{canOpenSettings && (
					<Link
						to="/o/$orgSlug/t/$tenantSlug/e/$eventSlug/settings"
						params={params}
						activeProps={active}
						className={link}
					>
						イベントの設定
					</Link>
				)}
				<span className="ml-auto text-xs text-gray-600">
					{eventContext.canEditShifts
						? "このイベントのシフトを編集できます"
						: "閲覧のみ"}
					・時間粒度 {eventContext.timeUnitMinutes} 分
				</span>
			</nav>
			<Outlet />
		</div>
	);
}
