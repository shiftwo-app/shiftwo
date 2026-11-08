import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import type { FormEvent } from "react";
import Alert from "../../components/ui/Alert";
import Button from "../../components/ui/Button";
import Field from "../../components/ui/Field";
import PageHeader from "../../components/ui/PageHeader";
import {
	formatInviteCode,
	INVITE_UNUSABLE_MESSAGES,
	type InviteUnusableReason,
} from "../../lib/org/invite-code";
import { NAME_MAX_LENGTH } from "../../lib/profile";
import { acceptInviteFn, previewInviteFn } from "../../server/org.functions";
import type { InvitePreview } from "../../server/org.server";

type JoinFailure =
	| InviteUnusableReason
	| "not_found"
	| "already_member"
	| "discord_required"
	| "not_in_guild"
	| "discord_unavailable";

const OTHER_MESSAGES: Record<
	Exclude<JoinFailure, InviteUnusableReason>,
	string
> = {
	not_found: "招待コードが見つかりません。入力を確かめてください",
	already_member: "すでにこの団体のメンバーです",
	discord_required:
		"この団体に参加するには、Discord の連携が必要です。アカウントの設定で Discord を連携してから、もう一度試してください",
	not_in_guild:
		"この団体の Discord サーバーのメンバーではありません。サーバーに参加してから、もう一度試してください",
	discord_unavailable:
		"Discord に確かめられませんでした。時間をおいて、もう一度試してください",
};

const reasonMessage = (reason: JoinFailure) =>
	reason in OTHER_MESSAGES
		? OTHER_MESSAGES[reason as keyof typeof OTHER_MESSAGES]
		: INVITE_UNUSABLE_MESSAGES[reason as InviteUnusableReason];

// 招待コードで団体に参加する。?code= で開けば、コードが入った状態になる
export const Route = createFileRoute("/_authed/join")({
	validateSearch: (search: Record<string, unknown>) => ({
		code: typeof search.code === "string" ? search.code : "",
	}),
	head: () => ({ meta: [{ title: "招待コードで参加 | シフトヲ" }] }),
	component: JoinPage,
});

function JoinPage() {
	const { user } = Route.useRouteContext();
	const { code: initialCode } = Route.useSearch();
	const router = useRouter();
	const preview = useServerFn(previewInviteFn);
	const accept = useServerFn(acceptInviteFn);
	const [code, setCode] = useState(initialCode);
	const [found, setFound] = useState<Extract<
		InvitePreview,
		{ ok: true }
	> | null>(null);
	const [displayName, setDisplayName] = useState(user.name);
	const [busy, setBusy] = useState(false);
	const [errors, setErrors] = useState<string[]>([]);

	const check = async (event: FormEvent<HTMLFormElement>) => {
		event.preventDefault();
		setBusy(true);
		setErrors([]);
		try {
			const result = await preview({ data: { code } });
			if (!result.ok) {
				setErrors([reasonMessage(result.reason)]);
				return;
			}
			if (result.alreadyMember) {
				await router.navigate({
					to: "/o/$orgSlug",
					params: { orgSlug: result.organizationSlug },
				});
				return;
			}
			setFound(result);
		} finally {
			setBusy(false);
		}
	};

	const join = async (event: FormEvent<HTMLFormElement>) => {
		event.preventDefault();
		setBusy(true);
		setErrors([]);
		try {
			const result = await accept({ data: { code, displayName } });
			if (!result.ok) {
				setErrors(
					"errors" in result ? result.errors : [reasonMessage(result.reason)],
				);
				return;
			}
			await router.navigate({
				to: "/o/$orgSlug",
				params: { orgSlug: result.slug },
			});
		} finally {
			setBusy(false);
		}
	};

	return (
		<main className="mx-auto max-w-xl px-4 py-8 sm:px-6">
			<PageHeader title="招待コードで参加" />
			<div className="space-y-5 rounded-xl border border-line bg-surface p-6">
				{!found ? (
					<form onSubmit={check} className="space-y-4">
						<Field label="招待コード（8 文字）">
							{(props) => (
								<input
									{...props}
									required
									autoComplete="off"
									value={code}
									onChange={(event) => setCode(event.target.value)}
									className="control tabular w-full py-2 text-center font-mono text-2xl tracking-[0.3em] uppercase"
								/>
							)}
						</Field>
						<Button
							type="submit"
							variant="primary"
							disabled={busy}
							className="h-10 w-full"
						>
							確かめる
						</Button>
					</form>
				) : (
					<form onSubmit={join} className="space-y-4">
						<p className="text-sm leading-relaxed text-ink">
							「<strong className="font-bold">{found.organizationName}</strong>
							」に ロール「
							{found.roleName}」で参加します（招待コード{" "}
							<span className="font-mono tabular">
								{formatInviteCode(code.toUpperCase().replace(/[\s-]/g, ""))}
							</span>
							）。
						</p>
						{found.requiredDiscordGuildName && (
							<Alert tone="info">
								この団体は、Discord サーバー「{found.requiredDiscordGuildName}
								」のメンバーだけが参加できます。Discord
								を連携し、そのサーバーに参加している必要があります（
								<a
									href="/help/discord-server"
									className="font-bold text-primary underline underline-offset-4 hover:text-primary-strong"
								>
									くわしく
								</a>
								）。
							</Alert>
						)}
						<Field label="この団体でのあなたの表示名">
							{(props) => (
								<input
									{...props}
									required
									maxLength={NAME_MAX_LENGTH}
									value={displayName}
									onChange={(event) => setDisplayName(event.target.value)}
									className="control w-full"
								/>
							)}
						</Field>
						<Button
							type="submit"
							variant="primary"
							disabled={busy}
							className="h-10 w-full"
						>
							参加する
						</Button>
						<button
							type="button"
							onClick={() => setFound(null)}
							className="text-sm font-bold text-primary underline underline-offset-4 hover:text-primary-strong"
						>
							コードを入れ直す
						</button>
					</form>
				)}
				{errors.length > 0 && (
					<Alert tone="error">
						<ul className="space-y-1">
							{errors.map((message) => (
								<li key={message}>{message}</li>
							))}
						</ul>
					</Alert>
				)}
			</div>
		</main>
	);
}
