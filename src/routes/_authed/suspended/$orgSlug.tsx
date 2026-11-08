import {
	createFileRoute,
	notFound,
	redirect,
	useRouter,
} from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import Alert from "../../../components/ui/Alert";
import Badge from "../../../components/ui/Badge";
import Button from "../../../components/ui/Button";
import { useT } from "../../../lib/i18n/react";
import { translate } from "../../../lib/i18n/translate";
import { recheckMyGuildMembership } from "../../../server/discord.functions";
import { getOrganization } from "../../../server/org.functions";

// 団体の Discord サーバーを抜けて、見られなくなっている本人に理由を見せるページ
export const Route = createFileRoute("/_authed/suspended/$orgSlug")({
	beforeLoad: async ({ params }) => {
		const org = await getOrganization({ data: { orgSlug: params.orgSlug } });
		if (!org) throw notFound();
		if (org.status === "member") {
			throw redirect({
				to: "/o/$orgSlug",
				params: { orgSlug: params.orgSlug },
			});
		}
		return { suspended: org };
	},
	head: ({ match }) => ({
		meta: [
			{
				title: translate(match.context.locale, "shell.pageTitle", {
					page: translate(match.context.locale, "orgs.suspendedPageTitle"),
				}),
			},
		],
	}),
	component: SuspendedPage,
});

function SuspendedPage() {
	const { suspended } = Route.useRouteContext();
	const router = useRouter();
	const t = useT();
	const recheck = useServerFn(recheckMyGuildMembership);
	const [busy, setBusy] = useState(false);
	const [message, setMessage] = useState<string | null>(null);

	const onRecheck = async () => {
		setBusy(true);
		setMessage(null);
		try {
			const result = await recheck({
				data: { orgSlug: suspended.organization.slug },
			});
			if (result.restored) {
				await router.navigate({
					to: "/o/$orgSlug",
					params: { orgSlug: suspended.organization.slug },
				});
				return;
			}
			setMessage(t("orgs.suspendedRecheckFailed"));
		} finally {
			setBusy(false);
		}
	};

	const textLink =
		"font-bold text-primary underline underline-offset-4 hover:text-primary-strong";

	return (
		<main className="mx-auto max-w-2xl px-4 py-12 sm:px-6">
			<article className="space-y-6">
				<header className="space-y-2">
					<Badge tone="warn">{t("orgs.suspendedBadgeNow")}</Badge>
					<h1 className="text-2xl leading-tight font-bold tracking-tight text-ink">
						{suspended.organization.name}
					</h1>
				</header>
				<p className="text-base leading-loose text-ink">
					{t("orgs.suspendedBody", {
						guild: suspended.guildName ?? t("orgs.suspendedGuildFallback"),
					})}
				</p>
				<div className="space-y-4">
					<Button variant="primary" onClick={onRecheck} disabled={busy}>
						{t("orgs.suspendedRecheck")}
					</Button>
					{message && <Alert tone="error">{message}</Alert>}
				</div>
				<p className="border-t border-line pt-6 text-sm text-ink-muted">
					<a href="/account" className={textLink}>
						{t("orgs.suspendedAccountLink")}
					</a>
					{t("orgs.listSeparator")}
					<a href="/help/discord-server" className={textLink}>
						{t("orgs.learnMore")}
					</a>
				</p>
			</article>
		</main>
	);
}
