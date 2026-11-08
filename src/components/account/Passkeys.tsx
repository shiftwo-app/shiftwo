import { useRouter } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { authClient } from "../../lib/auth-client";
import { useIntlLocale, useT } from "../../lib/i18n/react";
import { deleteMyPasskeyFn } from "../../server/passkey.functions";
import { PasskeyMark } from "../auth/EmailOrDiscordAuth";
import Alert from "../ui/Alert";
import Badge from "../ui/Badge";
import Button from "../ui/Button";
import Section from "../ui/Section";

type Passkey = {
	id: string;
	name: string | null;
	createdAt: Date | string | null;
	backedUp: boolean;
};

type Message = { tone: "success" | "error"; text: string };

/** アカウントの設定：パスキーの一覧・登録・削除 */
const Passkeys = ({ passkeys }: { passkeys: Passkey[] }) => {
	const t = useT();
	const intlLocale = useIntlLocale();
	const router = useRouter();
	const remove = useServerFn(deleteMyPasskeyFn);
	const [supported, setSupported] = useState(true);
	const [busy, setBusy] = useState(false);
	const [message, setMessage] = useState<Message | null>(null);

	// 使えるブラウザかは、ブラウザで開いてから調べる
	useEffect(() => {
		setSupported(typeof window.PublicKeyCredential === "function");
	}, []);

	const add = async () => {
		setBusy(true);
		setMessage(null);
		const { error } = await authClient.passkey.addPasskey();
		setBusy(false);
		if (error) {
			// 本人が取り消したときは何も言わない
			if ("code" in error && error.code === "AUTH_CANCELLED") return;
			setMessage({ tone: "error", text: t("account.passkeyAddFailed") });
			return;
		}
		setMessage({ tone: "success", text: t("account.passkeyAdded") });
		await router.invalidate();
	};

	const removePasskey = async (passkey: Passkey) => {
		setBusy(true);
		setMessage(null);
		try {
			await remove({ data: { id: passkey.id } });
			setMessage({ tone: "success", text: t("account.passkeyRemoved") });
			await router.invalidate();
		} catch (error) {
			console.error(error);
			setMessage({ tone: "error", text: t("common.failed") });
		} finally {
			setBusy(false);
		}
	};

	const dateOf = (value: Date | string | null) =>
		value
			? new Intl.DateTimeFormat(intlLocale, {
					dateStyle: "medium",
					timeZone: "Asia/Tokyo",
				}).format(new Date(value))
			: null;

	return (
		<Section
			id="account-passkeys"
			title={t("account.passkeyTitle")}
			description={t("account.passkeyDescription")}
		>
			<div className="space-y-3">
				{message && <Alert tone={message.tone}>{message.text}</Alert>}
				{passkeys.length === 0 ? (
					<p className="text-sm text-ink-muted">{t("account.passkeyNone")}</p>
				) : (
					<ul className="divide-y divide-line rounded-lg border border-line">
						{passkeys.map((passkey) => (
							<li
								key={passkey.id}
								className="flex flex-wrap items-center gap-3 px-4 py-3 text-sm"
							>
								<span className="text-ink-muted">
									<PasskeyMark />
								</span>
								<div className="min-w-0 flex-1">
									<p className="font-bold break-all text-ink">
										{passkey.name || t("account.passkeyUnnamed")}
									</p>
									{passkey.createdAt && (
										<p className="text-xs text-ink-muted">
											{t("account.passkeyCreatedAt", {
												date: dateOf(passkey.createdAt) ?? "",
											})}
										</p>
									)}
								</div>
								{passkey.backedUp && (
									<Badge>{t("account.passkeySynced")}</Badge>
								)}
								<Button
									variant="ghost"
									size="sm"
									disabled={busy}
									onClick={() => void removePasskey(passkey)}
								>
									{t("account.passkeyRemove")}
								</Button>
							</li>
						))}
					</ul>
				)}
				{supported ? (
					<Button disabled={busy} onClick={() => void add()}>
						<PasskeyMark />
						{t("account.passkeyAdd")}
					</Button>
				) : (
					<p className="text-sm text-ink-muted">
						{t("account.passkeyUnsupported")}
					</p>
				)}
			</div>
		</Section>
	);
};

export default Passkeys;
