import { useId, useState } from "react";
import type { ChangeEvent } from "react";
import { AVATAR_MAX_BYTES, AVATAR_SIZE } from "../lib/avatar-image";
import { useT } from "../lib/i18n/react";
import Avatar from "./Avatar";
import { buttonClass } from "./ui/Button";

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

const messageOf = async (response: Response, fallback: string) => {
	try {
		const body = (await response.json()) as { message?: string };
		return body.message ?? fallback;
	} catch {
		return fallback;
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
	const t = useT();
	const [busy, setBusy] = useState(false);
	const [message, setMessage] = useState<string | null>(null);

	const send = async (init: RequestInit, done: string) => {
		setBusy(true);
		setMessage(null);
		try {
			const response = await fetch(endpoint, init);
			if (!response.ok) {
				setMessage(await messageOf(response, t("errors.failedShort")));
				return;
			}
			await onChanged();
			setMessage(done);
		} catch (error) {
			console.error(error);
			setMessage(t("common.failed"));
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
			setMessage(t("account.avatarUnreadable"));
			return;
		}
		if (blob.size > AVATAR_MAX_BYTES) {
			setMessage(t("account.avatarTooLarge"));
			return;
		}
		await send(
			{ method: "POST", headers: { "content-type": blob.type }, body: blob },
			t("account.avatarChanged"),
		);
	};

	return (
		<div className="flex items-center gap-4">
			<Avatar name={name} url={currentUrl} size={64} />
			<div className="min-w-0 space-y-2">
				<div className="flex flex-wrap items-center gap-2">
					<label
						htmlFor={`${id}-file`}
						className={`${buttonClass("secondary", "sm")} cursor-pointer has-[+input:focus-visible]:outline-2 has-[+input:focus-visible]:outline-primary has-[+input:focus-visible]:outline-offset-2 aria-disabled:cursor-not-allowed aria-disabled:opacity-50`}
						aria-disabled={busy}
					>
						{t("account.avatarChoose")}
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
							className={buttonClass("ghost", "sm")}
							disabled={busy}
							onClick={() =>
								send({ method: "DELETE" }, t("account.avatarRemoved"))
							}
						>
							{removeLabel}
						</button>
					)}
				</div>
				{message && (
					<p role="status" className="text-sm text-ink-muted">
						{message}
					</p>
				)}
			</div>
		</div>
	);
}
