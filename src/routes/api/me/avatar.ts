import { createFileRoute } from "@tanstack/react-router";
import { AVATAR_MAX_BYTES } from "../../../lib/avatar-image";
import {
	readBodyWithLimit,
	removeUploadedAvatar,
	saveUploadedAvatar,
} from "../../../server/avatar.server";
import {
	forbiddenOrigin,
	isSameOriginRequest,
} from "../../../server/same-origin.server";
import { withUser } from "../../../server/session.server";

// アカウントのアイコン。POST の本文は画像そのもの（PNG・JPEG・WebP）
export const Route = createFileRoute("/api/me/avatar")({
	server: {
		handlers: {
			POST: withUser(async ({ request, user }) => {
				if (!isSameOriginRequest(request)) return forbiddenOrigin();
				const body = await readBodyWithLimit(request, AVATAR_MAX_BYTES);
				if (!body) {
					return Response.json(
						{ message: "画像が大きすぎます" },
						{ status: 413 },
					);
				}
				const result = await saveUploadedAvatar(
					{ kind: "user", userId: user.id },
					body,
				);
				return result.ok
					? Response.json({ ok: true })
					: Response.json(
							{ message: result.message },
							{ status: result.status },
						);
			}),
			DELETE: withUser(async ({ request, user }) => {
				if (!isSameOriginRequest(request)) return forbiddenOrigin();
				await removeUploadedAvatar({ kind: "user", userId: user.id });
				return Response.json({ ok: true });
			}),
		},
	},
});
