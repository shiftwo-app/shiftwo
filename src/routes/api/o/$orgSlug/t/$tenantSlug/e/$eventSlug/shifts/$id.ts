import { createFileRoute } from "@tanstack/react-router";
import {
	deleteShiftHandler,
	updateShiftHandler,
} from "../../../../../../../../../server/shift-api.server";

type Params = { orgSlug: string; tenantSlug: string; eventSlug: string } & {
	id: string;
};

// イベントのシフトの更新（PUT）と削除（DELETE）。その単位の中のシフトだけを扱う
export const Route = createFileRoute(
	"/api/o/$orgSlug/t/$tenantSlug/e/$eventSlug/shifts/$id",
)({
	server: {
		handlers: {
			PUT: updateShiftHandler<Params>(),
			DELETE: deleteShiftHandler<Params>(),
		},
	},
});
