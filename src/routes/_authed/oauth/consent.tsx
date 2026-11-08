import { createFileRoute } from "@tanstack/react-router";
import { useId, useState } from "react";
import Logo from "../../../components/Logo";
import Alert from "../../../components/ui/Alert";
import Button from "../../../components/ui/Button";
import { authClient } from "../../../lib/auth-client";
import { useT } from "../../../lib/i18n/react";
import { translate } from "../../../lib/i18n/translate";
import { MCP_SCOPE_WRITE } from "../../../lib/mcp-config";
import { getConsentRequestFn } from "../../../server/oauth.functions";

// MCP のクライアント（AI のアシスタントのアプリ）をつなぐときの同意の画面。
// Better Auth（oauth-provider）が、認可のリクエストを署名付きのクエリにして、ここへ送ってくる。
// クエリは署名ごとそのまま /api/auth/oauth2/consent に返す。ルーターが読み直したクエリ（location.searchStr）は
// 並びや書き方が変わって署名が合わなくなるので、ブラウザのアドレス（window.location.search）をそのまま使う。
// そのため、この画面はブラウザでだけ読み込む（ssr: false）
const rawOAuthQuery = () => window.location.search.replace(/^\?/, "");

export const Route = createFileRoute("/_authed/oauth/consent")({
	ssr: false,
	validateSearch: (search: Record<string, unknown>) => search,
	loader: () => getConsentRequestFn({ data: { oauthQuery: rawOAuthQuery() } }),
	head: ({ match }) => ({
		meta: [
			{
				title: translate(match.context.locale, "shell.pageTitle", {
					page: translate(match.context.locale, "oauth.pageTitle"),
				}),
			},
		],
	}),
	component: ConsentPage,
});

type ConsentResponse = { redirect: boolean; url: string };

function ConsentPage() {
	const request = Route.useLoaderData();
	const t = useT();
	const id = useId();
	const [allowWrite, setAllowWrite] = useState(true);
	const [busy, setBusy] = useState(false);
	const [failed, setFailed] = useState(false);

	const answer = async (accept: boolean) => {
		if (!request) return;
		setBusy(true);
		setFailed(false);
		// 書く権限を外したときは、それを除いたスコープで同意する
		const scope = request.scopes
			.filter((scope) => accept && (allowWrite || scope !== MCP_SCOPE_WRITE))
			.join(" ");
		const { data, error } = await authClient.$fetch<ConsentResponse>(
			"/oauth2/consent",
			{
				method: "POST",
				body: {
					accept,
					...(accept ? { scope } : {}),
					oauth_query: rawOAuthQuery(),
				},
			},
		);
		if (error || !data?.url) {
			setBusy(false);
			setFailed(true);
			return;
		}
		// アプリの戻り先へ（認可のコード、または断ったことを付けて）
		window.location.assign(data.url);
	};

	return (
		<main className="px-4 py-12 sm:py-20">
			<div className="mx-auto max-w-md space-y-8">
				<Logo className="mx-auto h-16 w-auto text-ink" />
				{!request ? (
					<Alert tone="error">{t("oauth.consentInvalid")}</Alert>
				) : (
					<div className="space-y-6">
						<h1 className="text-center text-2xl leading-tight font-bold tracking-tight text-balance text-ink [word-break:auto-phrase]">
							{t("oauth.consentTitle", { app: request.clientName })}
						</h1>
						<div className="space-y-5 rounded-xl border border-line bg-surface p-6">
							<p className="text-sm leading-relaxed text-ink">
								{t("oauth.consentLead")}
							</p>
							<dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
								<dt className="text-ink-muted">{t("oauth.consentApp")}</dt>
								<dd className="font-bold break-all text-ink">
									{request.clientName}
									{request.clientHost && (
										<span className="ml-2 font-normal text-ink-muted">
											{request.clientHost}
										</span>
									)}
								</dd>
								{request.redirectHost && (
									<>
										<dt className="text-ink-muted">
											{t("oauth.consentReturnsTo")}
										</dt>
										<dd>
											<span className="font-bold break-all text-ink">
												{request.redirectHost}
											</span>
											<span className="block text-xs text-ink-muted">
												{t("oauth.consentReturnsToHint")}
											</span>
										</dd>
									</>
								)}
							</dl>
							<ul className="space-y-2 border-t border-line pt-4 text-sm text-ink">
								{request.wantsRead && <li>・{t("oauth.consentRead")}</li>}
								{request.wantsWrite && (
									<li>
										<label
											htmlFor={`${id}-write`}
											className="flex items-start gap-2"
										>
											<input
												id={`${id}-write`}
												type="checkbox"
												checked={allowWrite}
												onChange={(event) =>
													setAllowWrite(event.target.checked)
												}
												className="mt-1 size-4 accent-primary"
											/>
											<span>
												{t("oauth.consentWrite")}
												<span className="block text-xs text-ink-muted">
													{t("oauth.consentWriteOptional")}
												</span>
											</span>
										</label>
									</li>
								)}
							</ul>
							{failed && <Alert tone="error">{t("oauth.consentFailed")}</Alert>}
							<div className="flex flex-wrap justify-end gap-3">
								<Button
									variant="ghost"
									disabled={busy}
									onClick={() => void answer(false)}
								>
									{t("oauth.consentDeny")}
								</Button>
								<Button
									variant="primary"
									disabled={busy}
									onClick={() => void answer(true)}
								>
									{t("oauth.consentAllow")}
								</Button>
							</div>
						</div>
					</div>
				)}
			</div>
		</main>
	);
}
