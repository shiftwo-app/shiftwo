import { createFileRoute } from "@tanstack/react-router";
import {
	deleteShiftResponse,
	writeShift,
} from "../../../server/shift-write.server";
import { withUser } from "../../../server/session.server";

type ShiftRouteCtx = { request: Request; params: { id: string } };

export const Route = createFileRoute("/api/shifts/$id")({
	server: {
		handlers: {
			PUT: withUser<ShiftRouteCtx>(({ request, params }) =>
				writeShift(request, params.id),
			),
			DELETE: withUser<ShiftRouteCtx>(({ params }) =>
				deleteShiftResponse(params.id),
			),
		},
	},
});
