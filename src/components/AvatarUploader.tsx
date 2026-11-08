import { useId, useState } from "react";
import type { ChangeEvent } from "react";
import { AVATAR_MAX_BYTES, AVATAR_SIZE } from "../lib/avatar-image";
import Avatar from "./Avatar";

/**
 * 選んだ画像を、真ん中で正方形に切り抜いて AVATAR_SIZE に縮め、描き直す。
 * 描き直すので、写真に埋め込まれた撮影場所（EXIF）などは送らない
 */
const toAvatarBlob = async (file: File): Promise<Blob> => {
	const bitmap = await createImageBitmap(file);
	const side = Math.min(bitmap.width, bitmap.height);
	const canvas = document.createElement("canvas");
	canvas.width = AVATAR_SIZE;
	canvas.height = AVATAR_SIZE;
	const context = canvas.getContext("2d");
	if (!context) throw new Error("canvas が使えません");
	context.drawImage(
		bitmap,
		(bitmap.width - side) / 2,
		(bitmap.height - side) / 2,
		side,
		side,
		0,
		0,
		AVATAR_SIZE,
		AVATAR_SIZE,
	);
	bitmap.close();
	// WebP で書き出せないブラウザでは PNG になる（サーバーはどちらも受け付ける）
	const blob = await new Promise<Blob | null>((resolve) =>
		canvas.toBlob(resolve, "image/webp", 0.9),
	);
	if (!blob) throw new Error("画像を書き出せませんでした");
	return blob;
};

const messageOf = async (response: Response) => {
	try {
		const body = (await response.json()) as { message?: string };
		return body.message ?? "できませんでした";
	} catch {
		return "できませんでした";
	}
};

/** アイコンを選んでアップロードする・やめる。endpoint は POST（画像）と DELETE を受け付ける API */
export default function AvatarUploader({
	endpoint,
	name,
	currentUrl,
	hasUploaded,
	removeLabel,
	onChanged,
}: {
	endpoint: string;
	name: string;
	currentUrl: string | null;
	hasUploaded: boolean;
	removeLabel: string;
	onChanged: () => Promise<void>;
}) {
	const id = useId();
	const [busy, setBusy] = useState(false);
	const [message, setMessage] = useState<string | null>(null);

	const send = async (init: RequestInit, done: string) => {
		setBusy(true);
		setMessage(null);
		try {
			const response = await fetch(endpoint, init);
			if (!response.ok) {
				setMessage(await messageOf(response));
				return;
			}
			await onChanged();
			setMessage(done);
		} catch (error) {
			console.error(error);
			setMessage("できませんでした。時間をおいて、もう一度試してください");
		} finally {
			setBusy(false);
		}
	};

	const choose = async (event: ChangeEvent<HTMLInputElement>) => {
		const file = event.target.files?.[0];
		event.target.value = ""; // 同じファイルをもう一度選んでも動くように
		if (!file) return;
		let blob: Blob;
		try {
			blob = await toAvatarBlob(file);
		} catch (error) {
			console.error(error);
			setMessage("この画像は読み込めませんでした");
			return;
		}
		if (blob.size > AVATAR_MAX_BYTES) {
			setMessage("画像が大きすぎます");
			return;
		}
		await send(
			{ method: "POST", headers: { "content-type": blob.type }, body: blob },
			"アイコンを変えました",
		);
	};

	return (
		<div className="flex flex-wrap items-center gap-3 text-sm">
			<Avatar name={name} url={currentUrl} size={48} />
			<label
				htmlFor={`${id}-file`}
				className="cursor-pointer rounded border px-3 py-1 aria-disabled:opacity-50"
				aria-disabled={busy}
			>
				画像を選ぶ
			</label>
			<input
				id={`${id}-file`}
				type="file"
				accept="image/png,image/jpeg,image/webp"
				className="sr-only"
				disabled={busy}
				onChange={choose}
			/>
			{hasUploaded && (
				<button
					type="button"
					className="underline disabled:opacity-50"
					disabled={busy}
					onClick={() =>
						send({ method: "DELETE" }, "アップロードしたアイコンをやめました")
					}
				>
					{removeLabel}
				</button>
			)}
			{message && (
				<p role="status" className="w-full text-gray-700">
					{message}
				</p>
			)}
		</div>
	);
}
