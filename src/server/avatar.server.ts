// アイコンのアップロード。アカウントのアイコンと、団体ごとのアイコン（上書き）
import { detectAvatarImageType, AVATAR_MAX_BYTES } from "../lib/avatar-image";
import { serverT } from "../lib/i18n/request-locale.server";
import { prisma } from "../lib/prisma.server";
import type { BlobStore } from "../lib/storage/blob-store";
import { getBlobStore } from "../lib/storage/index.server";

/** どのアイコンか：アカウントのもの、または、ある団体での自分のもの */
export type AvatarTarget =
	| { kind: "user"; userId: string }
	| { kind: "member"; memberId: string };

export type AvatarUploadResult =
	| { ok: true; file: string }
	| { ok: false; status: 400 | 413; message: string };

export const avatarBlobKey = (file: string) => `avatars/${file}`;

/**
 * リクエストの本文を、上限までだけ読む。超えたら null（全部を読んでから捨てない。
 * Content-Length は送る側がごまかせるので、読みながら数える）
 */
export const readBodyWithLimit = async (
	request: Request,
	limit: number,
): Promise<Uint8Array | null> => {
	const declared = Number(request.headers.get("content-length"));
	if (Number.isFinite(declared) && declared > limit) return null;
	if (!request.body) return new Uint8Array();
	const reader = request.body.getReader();
	const chunks: Uint8Array[] = [];
	let total = 0;
	for (;;) {
		const { done, value } = await reader.read();
		if (done) break;
		total += value.byteLength;
		if (total > limit) {
			await reader.cancel();
			return null;
		}
		chunks.push(value);
	}
	const body = new Uint8Array(total);
	let offset = 0;
	for (const chunk of chunks) {
		body.set(chunk, offset);
		offset += chunk.byteLength;
	}
	return body;
};

const currentKey = async (target: AvatarTarget) =>
	target.kind === "user"
		? (
				await prisma.user.findUnique({
					where: { id: target.userId },
					select: { uploadedAvatarKey: true },
				})
			)?.uploadedAvatarKey
		: (
				await prisma.member.findUnique({
					where: { id: target.memberId },
					select: { uploadedAvatarKey: true },
				})
			)?.uploadedAvatarKey;

const setKey = (target: AvatarTarget, file: string | null) =>
	target.kind === "user"
		? prisma.user.update({
				where: { id: target.userId },
				data: { uploadedAvatarKey: file },
			})
		: prisma.member.update({
				where: { id: target.memberId },
				data: { uploadedAvatarKey: file },
			});

/** 前のファイルを消す。消せなくてもアイコンの変更は済んでいるので、記録だけ残す */
const deleteQuietly = async (
	store: BlobStore,
	file: string | null | undefined,
) => {
	if (!file) return;
	try {
		await store.delete(avatarBlobKey(file));
	} catch (error) {
		console.error("前のアイコンを消せませんでした", error);
	}
};

/** 画像を確かめて保存し、アイコンを差し替える */
export const saveUploadedAvatar = async (
	target: AvatarTarget,
	body: Uint8Array,
	store: BlobStore = getBlobStore(),
): Promise<AvatarUploadResult> => {
	if (body.byteLength > AVATAR_MAX_BYTES) {
		return {
			ok: false,
			status: 413,
			message: serverT("account.avatarTooLarge"),
		};
	}
	const type = detectAvatarImageType(body);
	if (!type) {
		return {
			ok: false,
			status: 400,
			message: serverT("account.avatarWrongType"),
		};
	}
	// ファイル名は毎回新しくする（差し替えた直後に、ブラウザの古いキャッシュが出ないように）
	const file = `${crypto.randomUUID()}.${type.ext}`;
	const previous = await currentKey(target);
	await store.put(avatarBlobKey(file), body, type.contentType);
	try {
		await setKey(target, file);
	} catch (error) {
		await deleteQuietly(store, file);
		throw error;
	}
	await deleteQuietly(store, previous);
	return { ok: true, file };
};

/** アップロードしたアイコンをやめる（Discord のアイコンや頭文字に戻る） */
export const removeUploadedAvatar = async (
	target: AvatarTarget,
	store: BlobStore = getBlobStore(),
): Promise<void> => {
	const previous = await currentKey(target);
	if (!previous) return;
	await setKey(target, null);
	await deleteQuietly(store, previous);
};
