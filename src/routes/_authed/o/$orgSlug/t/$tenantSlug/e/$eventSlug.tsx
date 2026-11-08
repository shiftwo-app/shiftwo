import { createFileRoute, notFound, Outlet } from "@tanstack/react-router";
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

// メニュー（パンくずとタブ）は、団体の画面の土台（$orgSlug.tsx）がまとめて出す
function EventLayout() {
	return <Outlet />;
}
