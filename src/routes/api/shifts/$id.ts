import { createFileRoute } from "@tanstack/react-router";
import {
	deleteShiftResponse,
	writeShift,
} from "../../../server/shift-write.server";

export const Route = createFileRoute("/api/shifts/$id")({
	server: {
		handlers: {
			PUT: ({ request, params }) => writeShift(request, params.id),
			DELETE: ({ params }) => deleteShiftResponse(params.id),
		},
	},
});
