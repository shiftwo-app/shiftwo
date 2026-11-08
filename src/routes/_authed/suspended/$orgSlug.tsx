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
	head: () => ({ meta: [{ title: "見られません | シフトヲ" }] }),
	component: SuspendedPage,
});

function SuspendedPage() {
	const { suspended } = Route.useRouteContext();
	const router = useRouter();
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
			setMessage(
				"まだサーバーのメンバーであることを確かめられませんでした。サーバーに参加しているか、Discord の連携が切れていないかを確かめてください",
			);
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
					<Badge tone="warn">今は見られません</Badge>
					<h1 className="text-2xl leading-tight font-bold tracking-tight text-ink">
						{suspended.organization.name}
					</h1>
				</header>
				<p className="text-base leading-loose text-ink">
					この団体は、Discord サーバー「
					{suspended.guildName ?? "指定のサーバー"}
					」のメンバーだけが見られます。サーバーを抜けたか、Discord
					の連携が切れているため、今は見られません。
					メンバーの情報は残っているので、サーバーに戻れば、また見られるようになります。
				</p>
				<div className="space-y-4">
					<Button variant="primary" onClick={onRecheck} disabled={busy}>
						もう一度確かめる
					</Button>
					{message && <Alert tone="error">{message}</Alert>}
				</div>
				<p className="border-t border-line pt-6 text-sm text-ink-muted">
					<a href="/account" className={textLink}>
						アカウントの設定（Discord の連携）
					</a>
					・
					<a href="/help/discord-server" className={textLink}>
						くわしく
					</a>
				</p>
			</article>
		</main>
	);
}
