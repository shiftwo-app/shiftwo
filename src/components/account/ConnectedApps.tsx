import { useRouter } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { useIntlLocale, useT } from "../../lib/i18n/react";
import { disconnectAppFn } from "../../server/oauth.functions";
import Alert from "../ui/Alert";
import Badge from "../ui/Badge";
import Button from "../ui/Button";
import Section from "../ui/Section";

type App = {
	clientId: string;
	name: string;
	host: string | null;
	canWrite: boolean;
	connectedAt: Date | string | null;
};

/** アカウントの設定：MCP でつないだアプリ（AI のアシスタント）と、つながりを切るボタン */
const ConnectedApps = ({ apps, mcpUrl }: { apps: App[]; mcpUrl: string }) => {
	const t = useT();
	const intlLocale = useIntlLocale();
	const router = useRouter();
	const disconnect = useServerFn(disconnectAppFn);
	const [busy, setBusy] = useState<string | null>(null);
	const [done, setDone] = useState<string | null>(null);
	const [failed, setFailed] = useState(false);

	const run = async (app: App) => {
		setBusy(app.clientId);
		setFailed(false);
		try {
			await disconnect({ data: { clientId: app.clientId } });
			setDone(app.name);
			await router.invalidate();
		} catch (error) {
			console.error(error);
			setFailed(true);
		} finally {
			setBusy(null);
		}
	};

	return (
		<Section
			id="account-apps"
			title={t("oauth.appsTitle")}
			description={t("oauth.appsDescription", { url: mcpUrl })}
		>
			<div className="space-y-3">
				{done && (
					<Alert tone="success">
						{t("oauth.appsDisconnected", { app: done })}
					</Alert>
				)}
				{failed && <Alert tone="error">{t("common.failed")}</Alert>}
				{apps.length === 0 ? (
					<p className="text-sm text-ink-muted">{t("oauth.appsNone")}</p>
				) : (
					<ul className="divide-y divide-line rounded-lg border border-line">
						{apps.map((app) => (
							<li
								key={app.clientId}
								className="flex flex-wrap items-center gap-3 px-4 py-3 text-sm"
							>
								<div className="min-w-0 flex-1">
									<p className="font-bold break-all text-ink">{app.name}</p>
									<p className="text-xs text-ink-muted">
										{[
											app.host,
											app.connectedAt &&
												t("oauth.appsConnectedAt", {
													date: new Intl.DateTimeFormat(intlLocale, {
														dateStyle: "medium",
														timeZone: "Asia/Tokyo",
													}).format(new Date(app.connectedAt)),
												}),
										]
											.filter(Boolean)
											.join(" / ")}
									</p>
								</div>
								<Badge tone={app.canWrite ? "primary" : "neutral"}>
									{app.canWrite
										? t("oauth.appsCanWrite")
										: t("oauth.appsReadOnly")}
								</Badge>
								<Button
									variant="ghost"
									size="sm"
									disabled={busy !== null}
									onClick={() => void run(app)}
								>
									{t("oauth.appsDisconnect")}
								</Button>
							</li>
						))}
					</ul>
				)}
			</div>
		</Section>
	);
};

export default ConnectedApps;
