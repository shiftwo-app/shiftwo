import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useId, useState } from "react";
import type { FormEvent } from "react";
import {
	formatInviteCode,
	INVITE_DEFAULT_EXPIRES_DAYS,
	INVITE_DEFAULT_MAX_USES,
	INVITE_MAX_EXPIRES_DAYS,
	INVITE_MAX_USES_LIMIT,
	inviteUnusableReason,
} from "../../../../lib/org/invite-code";
import {
	assignableMemberRoles,
	can,
	type MemberRole,
	ROLE_LABELS,
} from "../../../../lib/org/permissions";
import { NAME_MAX_LENGTH } from "../../../../lib/profile";
import {
	changeMemberRole,
	createInviteFn,
	listInvites,
	listMembers,
	removeMember,
	revokeInvite,
	updateMyDisplayName,
} from "../../../../server/org.functions";

export const Route = createFileRoute("/_authed/o/$orgSlug/settings")({
	loader: async ({ params, context }) => {
		const [members, invites] = await Promise.all([
			listMembers({ data: { orgSlug: params.orgSlug } }),
			can(context.member.role, "invite.manage")
				? listInvites({ data: { orgSlug: params.orgSlug } })
				: Promise.resolve(null),
		]);
		return { members, invites };
	},
	component: SettingsPage,
});

const dateFormatter = new Intl.DateTimeFormat("ja-JP", {
	timeZone: "Asia/Tokyo",
	month: "numeric",
	day: "numeric",
	hour: "2-digit",
	minute: "2-digit",
});

function SettingsPage() {
	const { organization, member } = Route.useRouteContext();
	const { members, invites } = Route.useLoaderData();
	const router = useRouter();
	const [errors, setErrors] = useState<string[]>([]);

	/** 操作を 1 回行い、できたら画面を読み直す */
	const run = async (
		action: () => Promise<{ ok: boolean; errors?: string[] }>,
	) => {
		setErrors([]);
		try {
			const result = await action();
			if (!result.ok) {
				setErrors(result.errors ?? ["できませんでした"]);
				return false;
			}
			await router.invalidate();
			return true;
		} catch (error) {
			console.error(error);
			setErrors(["できませんでした。時間をおいて、もう一度試してください"]);
			return false;
		}
	};

	return (
		<main className="mx-auto max-w-3xl space-y-8 p-4">
			<h1 className="text-xl font-bold">設定・メンバー</h1>
			{errors.length > 0 && (
				<ul
					role="alert"
					className="rounded border border-red-300 bg-red-50 p-2 text-sm text-red-800"
				>
					{errors.map((message) => (
						<li key={message}>{message}</li>
					))}
				</ul>
			)}
			<DisplayNameSection
				orgSlug={organization.slug}
				current={member.displayName}
				run={run}
			/>
			<MembersSection
				orgSlug={organization.slug}
				members={members}
				canManage={can(member.role, "member.manage")}
				run={run}
			/>
			{invites && (
				<InvitesSection
					orgSlug={organization.slug}
					invites={invites.invites}
					assignableRoles={invites.assignableRoles}
					run={run}
				/>
			)}
		</main>
	);
}

type Run = (
	action: () => Promise<{ ok: boolean; errors?: string[] }>,
) => Promise<boolean>;

const section = "space-y-3";
const heading = "text-lg font-semibold";
const control = "rounded border px-2 py-1";
const primary =
	"rounded bg-blue-600 px-3 py-1 text-sm font-semibold text-white disabled:opacity-50";

function DisplayNameSection({
	orgSlug,
	current,
	run,
}: {
	orgSlug: string;
	current: string;
	run: Run;
}) {
	const update = useServerFn(updateMyDisplayName);
	const id = useId();
	const [value, setValue] = useState(current);
	const submit = (event: FormEvent<HTMLFormElement>) => {
		event.preventDefault();
		void run(() => update({ data: { orgSlug, displayName: value } }));
	};
	return (
		<section className={section} aria-labelledby={`${id}-h`}>
			<h2 id={`${id}-h`} className={heading}>
				この団体でのあなたの表示名
			</h2>
			<form onSubmit={submit} className="flex flex-wrap items-center gap-2">
				<label htmlFor={`${id}-input`} className="sr-only">
					表示名
				</label>
				<input
					id={`${id}-input`}
					required
					maxLength={NAME_MAX_LENGTH}
					value={value}
					onChange={(event) => setValue(event.target.value)}
					className={control}
				/>
				<button type="submit" className={primary}>
					変える
				</button>
			</form>
		</section>
	);
}

function MembersSection({
	orgSlug,
	members,
	canManage,
	run,
}: {
	orgSlug: string;
	members: {
		id: string;
		role: MemberRole;
		displayName: string;
		isMe: boolean;
	}[];
	canManage: boolean;
	run: Run;
}) {
	const change = useServerFn(changeMemberRole);
	const remove = useServerFn(removeMember);
	const id = useId();
	return (
		<section className={section} aria-labelledby={`${id}-h`}>
			<h2 id={`${id}-h`} className={heading}>
				メンバー（{members.length} 人）
			</h2>
			<ul className="divide-y rounded border">
				{members.map((m) => (
					<li
						key={m.id}
						className="flex flex-wrap items-center gap-3 px-3 py-2 text-sm"
					>
						<span className="font-semibold">
							{m.displayName}
							{m.isMe && "（あなた）"}
						</span>
						{canManage && m.role !== "owner" ? (
							<>
								<label className="sr-only" htmlFor={`${id}-${m.id}`}>
									{m.displayName}の役割
								</label>
								<select
									id={`${id}-${m.id}`}
									value={m.role}
									onChange={(event) =>
										void run(() =>
											change({
												data: {
													orgSlug,
													memberId: m.id,
													role: event.target.value,
												},
											}),
										)
									}
									className={control}
								>
									{assignableMemberRoles.map((role) => (
										<option key={role} value={role}>
											{ROLE_LABELS[role]}
										</option>
									))}
								</select>
								<button
									type="button"
									onClick={() =>
										void run(() =>
											remove({ data: { orgSlug, memberId: m.id } }),
										)
									}
									className="ml-auto text-red-700 underline"
								>
									外す
								</button>
							</>
						) : (
							<span className="text-gray-600">{ROLE_LABELS[m.role]}</span>
						)}
					</li>
				))}
			</ul>
		</section>
	);
}

type InviteRow = {
	id: string;
	code: string;
	role: MemberRole;
	maxUses: number | null;
	uses: number;
	expiresAt: Date;
	revokedAt: Date | null;
};

function InvitesSection({
	orgSlug,
	invites,
	assignableRoles,
	run,
}: {
	orgSlug: string;
	invites: InviteRow[];
	assignableRoles: MemberRole[];
	run: Run;
}) {
	const create = useServerFn(createInviteFn);
	const revoke = useServerFn(revokeInvite);
	const id = useId();
	const [role, setRole] = useState<MemberRole>(
		assignableRoles.includes("staff")
			? "staff"
			: (assignableRoles[0] ?? "staff"),
	);
	const [unlimited, setUnlimited] = useState(false);
	const [maxUses, setMaxUses] = useState(INVITE_DEFAULT_MAX_USES);
	const [expiresInDays, setExpiresInDays] = useState(
		INVITE_DEFAULT_EXPIRES_DAYS,
	);
	const [copied, setCopied] = useState<string | null>(null);

	const submit = (event: FormEvent<HTMLFormElement>) => {
		event.preventDefault();
		void run(() =>
			create({
				data: {
					orgSlug,
					role,
					maxUses: unlimited ? null : maxUses,
					expiresInDays,
				},
			}),
		);
	};

	const joinUrl = (code: string) =>
		`${window.location.origin}/join?code=${encodeURIComponent(code)}`;

	const copy = async (code: string) => {
		await navigator.clipboard.writeText(joinUrl(code));
		setCopied(code);
	};

	return (
		<section className={section} aria-labelledby={`${id}-h`}>
			<h2 id={`${id}-h`} className={heading}>
				招待コード
			</h2>
			<form
				onSubmit={submit}
				className="flex flex-wrap items-end gap-3 rounded border p-3 text-sm"
			>
				<label className="flex flex-col gap-1" htmlFor={`${id}-role`}>
					参加したときの役割
					<select
						id={`${id}-role`}
						value={role}
						onChange={(event) => setRole(event.target.value as MemberRole)}
						className={control}
					>
						{assignableRoles.map((r) => (
							<option key={r} value={r}>
								{ROLE_LABELS[r]}
							</option>
						))}
					</select>
				</label>
				<label className="flex flex-col gap-1" htmlFor={`${id}-uses`}>
					使える回数
					<input
						id={`${id}-uses`}
						type="number"
						min={1}
						max={INVITE_MAX_USES_LIMIT}
						disabled={unlimited}
						value={maxUses}
						onChange={(event) => setMaxUses(Number(event.target.value))}
						className={`${control} w-24`}
					/>
				</label>
				<label className="flex items-center gap-1 pb-1">
					<input
						type="checkbox"
						checked={unlimited}
						onChange={(event) => setUnlimited(event.target.checked)}
					/>
					制限なし
				</label>
				<label className="flex flex-col gap-1" htmlFor={`${id}-days`}>
					有効期限（日）
					<input
						id={`${id}-days`}
						type="number"
						min={1}
						max={INVITE_MAX_EXPIRES_DAYS}
						value={expiresInDays}
						onChange={(event) => setExpiresInDays(Number(event.target.value))}
						className={`${control} w-24`}
					/>
				</label>
				<button type="submit" className={primary}>
					発行する
				</button>
			</form>
			{invites.length === 0 ? (
				<p className="text-sm text-gray-600">まだ招待コードはありません。</p>
			) : (
				<ul className="divide-y rounded border text-sm">
					{invites.map((invite) => {
						const reason = inviteUnusableReason(invite);
						return (
							<li
								key={invite.id}
								className="flex flex-wrap items-center gap-3 px-3 py-2"
							>
								<span
									className={`font-mono text-base ${reason ? "text-gray-400 line-through" : ""}`}
								>
									{formatInviteCode(invite.code)}
								</span>
								<span>{ROLE_LABELS[invite.role]}</span>
								<span className="text-gray-600">
									{invite.uses}/{invite.maxUses ?? "∞"} 回
								</span>
								<span className="text-gray-600">
									{reason === "revoked"
										? "取り消し済み"
										: reason === "expired"
											? "期限切れ"
											: reason === "used_up"
												? "使い切り"
												: `${dateFormatter.format(invite.expiresAt)} まで`}
								</span>
								{!reason && (
									<span className="ml-auto flex gap-3">
										<button
											type="button"
											onClick={() => void copy(invite.code)}
											className="underline"
										>
											{copied === invite.code
												? "コピーしました"
												: "参加用のリンクをコピー"}
										</button>
										<button
											type="button"
											onClick={() =>
												void run(() =>
													revoke({ data: { orgSlug, inviteId: invite.id } }),
												)
											}
											className="text-red-700 underline"
										>
											取り消す
										</button>
									</span>
								)}
							</li>
						);
					})}
				</ul>
			)}
		</section>
	);
}
