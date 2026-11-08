import { createFileRoute } from "@tanstack/react-router";
import TimetablePage from "../../../../../../../../components/timetable/TimetablePage";
import { translate } from "../../../../../../../../lib/i18n/translate";
import { getTimetableFn } from "../../../../../../../../server/timetable.functions";

// イベントのタイムテーブル（FR-6）
export const Route = createFileRoute(
	"/_authed/o/$orgSlug/t/$tenantSlug/e/$eventSlug/timetable",
)({
	loader: ({ params }) => getTimetableFn({ data: params }),
	head: ({ match }) => ({
		meta: [
			{
				title: translate(match.context.locale, "shell.pageTitle", {
					page: translate(match.context.locale, "timetable.pageTitle"),
				}),
			},
		],
	}),
	component: () => (
		<TimetablePage page={Route.useLoaderData()} scope={Route.useParams()} />
	),
});
