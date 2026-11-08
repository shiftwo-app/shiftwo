import {
	createFileRoute,
	notFound,
	redirect,
	useRouter,
} from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
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
	head: () => ({ meta: [{ title: "見られません | shiftwo" }] }),
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

	return (
		<main className="mx-auto max-w-md space-y-4 p-6">
			<h1 className="text-2xl font-bold">{suspended.organization.name}</h1>
			<p className="text-sm">
				この団体は、Discord サーバー「{suspended.guildName ?? "指定のサーバー"}
				」のメンバーだけが見られます。サーバーを抜けたか、Discord
				の連携が切れているため、今は見られません。
				メンバーの情報は残っているので、サーバーに戻れば、また見られるようになります。
			</p>
			<button
				type="button"
				onClick={onRecheck}
				disabled={busy}
				className="rounded bg-blue-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
			>
				もう一度確かめる
			</button>
			{message && (
				<p role="alert" className="text-sm text-red-700">
					{message}
				</p>
			)}
			<p className="text-sm">
				<a href="/account" className="underline">
					アカウントの設定（Discord の連携）
				</a>
				・
				<a href="/help/discord-server" className="underline">
					くわしく
				</a>
			</p>
		</main>
	);
}
