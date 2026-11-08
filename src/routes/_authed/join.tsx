import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useId, useState } from "react";
import type { FormEvent } from "react";
import {
	formatInviteCode,
	INVITE_UNUSABLE_MESSAGES,
	type InviteUnusableReason,
} from "../../lib/org/invite-code";
import { ROLE_LABELS } from "../../lib/org/permissions";
import { NAME_MAX_LENGTH } from "../../lib/profile";
import { acceptInviteFn, previewInviteFn } from "../../server/org.functions";
import type { InvitePreview } from "../../server/org.server";

const reasonMessage = (
	reason: InviteUnusableReason | "not_found" | "already_member",
) =>
	reason === "not_found"
		? "招待コードが見つかりません。入力を確かめてください"
		: reason === "already_member"
			? "すでにこの団体のメンバーです"
			: INVITE_UNUSABLE_MESSAGES[reason];

// 招待コードで団体に参加する。?code= で開けば、コードが入った状態になる
export const Route = createFileRoute("/_authed/join")({
	validateSearch: (search: Record<string, unknown>) => ({
		code: typeof search.code === "string" ? search.code : "",
	}),
	head: () => ({ meta: [{ title: "招待コードで参加 | shiftwo" }] }),
	component: JoinPage,
});

function JoinPage() {
	const { user } = Route.useRouteContext();
	const { code: initialCode } = Route.useSearch();
	const router = useRouter();
	const preview = useServerFn(previewInviteFn);
	const accept = useServerFn(acceptInviteFn);
	const id = useId();
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

	const control = "w-full rounded border px-3 py-2";
	const primary =
		"w-full rounded bg-blue-600 px-4 py-2 font-semibold text-white disabled:opacity-50";
	return (
		<main className="mx-auto max-w-md space-y-6 p-6">
			<h1 className="text-2xl font-bold">招待コードで参加</h1>
			{!found ? (
				<form onSubmit={check} className="space-y-3">
					<label htmlFor={`${id}-code`} className="block text-sm">
						招待コード（8 文字）
					</label>
					<input
						id={`${id}-code`}
						required
						autoComplete="off"
						value={code}
						onChange={(event) => setCode(event.target.value)}
						className={`${control} text-center font-mono text-xl tracking-widest uppercase`}
					/>
					<button type="submit" disabled={busy} className={primary}>
						確かめる
					</button>
				</form>
			) : (
				<form onSubmit={join} className="space-y-3">
					<p className="text-sm">
						「<strong>{found.organizationName}</strong>」に
						{ROLE_LABELS[found.role]}として参加します（招待コード{" "}
						{formatInviteCode(code.toUpperCase().replace(/[\s-]/g, ""))}）。
					</p>
					<label htmlFor={`${id}-display`} className="block text-sm">
						この団体でのあなたの表示名
					</label>
					<input
						id={`${id}-display`}
						required
						maxLength={NAME_MAX_LENGTH}
						value={displayName}
						onChange={(event) => setDisplayName(event.target.value)}
						className={control}
					/>
					<button type="submit" disabled={busy} className={primary}>
						参加する
					</button>
					<button
						type="button"
						onClick={() => setFound(null)}
						className="text-sm underline"
					>
						コードを入れ直す
					</button>
				</form>
			)}
			{errors.length > 0 && (
				<ul role="alert" className="text-sm text-red-700">
					{errors.map((message) => (
						<li key={message}>{message}</li>
					))}
				</ul>
			)}
		</main>
	);
}
