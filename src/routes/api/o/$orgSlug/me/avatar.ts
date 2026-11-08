import { createFileRoute } from "@tanstack/react-router";
import { AVATAR_MAX_BYTES } from "../../../../../lib/avatar-image";
import { serverT } from "../../../../../lib/i18n/request-locale.server";
import {
	readBodyWithLimit,
	removeUploadedAvatar,
	saveUploadedAvatar,
} from "../../../../../server/avatar.server";
import { findMembership } from "../../../../../server/org-access.server";
import {
	forbiddenOrigin,
	isSameOriginRequest,
} from "../../../../../server/same-origin.server";
import { withUser } from "../../../../../server/session.server";

type Ctx = { request: Request; params: { orgSlug: string } };

const notFound = () => Response.json({ message: "Not found" }, { status: 404 });

// この団体でだけ使う、自分のアイコン（アカウントのアイコンの上書き）。団体のメンバーなら誰でも変えられる
export const Route = createFileRoute("/api/o/$orgSlug/me/avatar")({
	server: {
		handlers: {
			POST: withUser<Ctx>(async ({ request, params, user }) => {
				if (!isSameOriginRequest(request)) return forbiddenOrigin();
				const membership = await findMembership(user.id, params.orgSlug);
				if (!membership) return notFound();
				const body = await readBodyWithLimit(request, AVATAR_MAX_BYTES);
				if (!body) {
					return Response.json(
						{ message: serverT("account.avatarTooLarge") },
						{ status: 413 },
					);
				}
				const result = await saveUploadedAvatar(
					{ kind: "member", memberId: membership.member.id },
					body,
				);
				return result.ok
					? Response.json({ ok: true })
					: Response.json(
							{ message: result.message },
							{ status: result.status },
						);
			}),
			DELETE: withUser<Ctx>(async ({ request, params, user }) => {
				if (!isSameOriginRequest(request)) return forbiddenOrigin();
				const membership = await findMembership(user.id, params.orgSlug);
				if (!membership) return notFound();
				await removeUploadedAvatar({
					kind: "member",
					memberId: membership.member.id,
				});
				return Response.json({ ok: true });
			}),
		},
	},
});
