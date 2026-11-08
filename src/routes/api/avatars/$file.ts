import { createFileRoute } from "@tanstack/react-router";
import { isUploadedAvatarFile } from "../../../lib/avatar";
import { avatarBlobKey } from "../../../server/avatar.server";
import { getBlobStore } from "../../../lib/storage/index.server";
import { withUser } from "../../../server/session.server";

type Ctx = { request: Request; params: { file: string } };

const notFound = () => new Response("Not found", { status: 404 });

// アップロードしたアイコンを返す。ログインしている人だけ（ファイル名は推測できない uuid）
export const Route = createFileRoute("/api/avatars/$file")({
	server: {
		handlers: {
			GET: withUser<Ctx>(async ({ params }) => {
				if (!isUploadedAvatarFile(params.file)) return notFound();
				const blob = await getBlobStore().get(avatarBlobKey(params.file));
				if (!blob) return notFound();
				return new Response(blob.body, {
					headers: {
						"content-type": blob.contentType,
						// 中身から種類を推測させない・ページとして開かれても何も動かさない
						"x-content-type-options": "nosniff",
						"content-security-policy": "default-src 'none'; sandbox",
						// ファイル名は差し替えるたびに変わるので、ずっとキャッシュしてよい（ログインした人だけなので private）
						"cache-control": "private, max-age=31536000, immutable",
					},
				});
			}),
		},
	},
});
