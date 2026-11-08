import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import type { FormEvent, ReactNode } from "react";
import Alert from "../../components/ui/Alert";
import Button from "../../components/ui/Button";
import Field from "../../components/ui/Field";
import PageHeader from "../../components/ui/PageHeader";
import type { MessageKey } from "../../lib/i18n/messages";
import { useT } from "../../lib/i18n/react";
import { type Translate, translate } from "../../lib/i18n/translate";
import {
	formatInviteCode,
	INVITE_UNUSABLE_MESSAGE_KEYS,
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
	MessageKey
> = {
	not_found: "orgs.joinNotFound",
	already_member: "orgs.joinAlreadyMember",
	discord_required: "orgs.joinDiscordRequired",
	not_in_guild: "orgs.joinNotInGuild",
	discord_unavailable: "orgs.joinDiscordUnavailable",
};

const reasonMessage = (t: Translate, reason: JoinFailure) =>
	t(
		reason in OTHER_MESSAGES
			? OTHER_MESSAGES[reason as keyof typeof OTHER_MESSAGES]
			: INVITE_UNUSABLE_MESSAGE_KEYS[reason as InviteUnusableReason],
	);

/** 訳文の {name} の位置に、要素を差し込む（太字や等幅で見せたいところ） */
const fill = (template: string, parts: Record<string, ReactNode>) =>
	template
		.split(/\{(\w+)\}/)
		.map((part, index) =>
			index % 2 === 1 ? <span key={index}>{parts[part] ?? part}</span> : part,
		);

// 招待コードで団体に参加する。?code= で開けば、コードが入った状態になる
export const Route = createFileRoute("/_authed/join")({
	validateSearch: (search: Record<string, unknown>) => ({
		code: typeof search.code === "string" ? search.code : "",
	}),
	head: ({ match }) => ({
		meta: [
			{
				title: translate(match.context.locale, "shell.pageTitle", {
					page: translate(match.context.locale, "orgs.joinWithCode"),
				}),
			},
		],
	}),
	component: JoinPage,
});

function JoinPage() {
	const { user } = Route.useRouteContext();
	const { code: initialCode } = Route.useSearch();
	const router = useRouter();
	const t = useT();
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
				setErrors([reasonMessage(t, result.reason)]);
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
					"errors" in result
						? result.errors
						: [reasonMessage(t, result.reason)],
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
			<PageHeader title={t("orgs.joinWithCode")} />
			<div className="space-y-5 rounded-xl border border-line bg-surface p-6">
				{!found ? (
					<form onSubmit={check} className="space-y-4">
						<Field label={t("orgs.inviteCodeLabel")}>
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
							{t("orgs.joinCheck")}
						</Button>
					</form>
				) : (
					<form onSubmit={join} className="space-y-4">
						<p className="text-sm leading-relaxed text-ink">
							{fill(t("orgs.joinConfirm"), {
								org: (
									<strong className="font-bold">
										{found.organizationName}
									</strong>
								),
								role: found.roleName,
								code: (
									<span className="font-mono tabular">
										{formatInviteCode(code.toUpperCase().replace(/[\s-]/g, ""))}
									</span>
								),
							})}
						</p>
						{found.requiredDiscordGuildName && (
							<Alert tone="info">
								{fill(t("orgs.joinGuildRequired"), {
									guild: found.requiredDiscordGuildName,
									more: (
										<a
											href="/help/discord-server"
											className="font-bold text-primary underline underline-offset-4 hover:text-primary-strong"
										>
											{t("orgs.learnMore")}
										</a>
									),
								})}
							</Alert>
						)}
						<Field label={t("orgs.displayNameLabel")}>
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
							{t("orgs.joinSubmit")}
						</Button>
						<button
							type="button"
							onClick={() => setFound(null)}
							className="text-sm font-bold text-primary underline underline-offset-4 hover:text-primary-strong"
						>
							{t("orgs.joinReenterCode")}
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
