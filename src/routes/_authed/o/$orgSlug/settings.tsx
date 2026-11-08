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
	hasPermission,
	PERMISSIONS,
	type Permission,
} from "../../../../lib/org/permissions";
import { NAME_MAX_LENGTH } from "../../../../lib/profile";
import {
	createInviteFn,
	createRoleFn,
	deleteRoleFn,
	listInvites,
	listMembers,
	listRoles,
	removeMember,
	revokeInvite,
	setMemberRolesFn,
	updateMyDisplayName,
	updateRoleFn,
} from "../../../../server/org.functions";

export const Route = createFileRoute("/_authed/o/$orgSlug/settings")({
	loader: async ({ params, context }) => {
		const perms = context.member.permissions;
		const orgSlug = params.orgSlug;
		const [members, roles, invites] = await Promise.all([
			hasPermission(perms, "member.view")
				? listMembers({ data: { orgSlug } })
				: Promise.resolve(null),
			hasPermission(perms, "member.view")
				? listRoles({ data: { orgSlug } })
				: Promise.resolve([]),
			hasPermission(perms, "invite.manage")
				? listInvites({ data: { orgSlug } })
				: Promise.resolve(null),
		]);
		return { members, roles, invites };
	},
	component: SettingsPage,
});

type RoleRow = Awaited<ReturnType<typeof listRoles>>[number];
type Run = (
	action: () => Promise<{ ok: boolean; errors?: string[] }>,
) => Promise<boolean>;

const dateFormatter = new Intl.DateTimeFormat("ja-JP", {
	timeZone: "Asia/Tokyo",
	month: "numeric",
	day: "numeric",
	hour: "2-digit",
	minute: "2-digit",
});

const section = "space-y-3";
const heading = "text-lg font-semibold";
const control = "rounded border px-2 py-1";
const primary =
	"rounded bg-blue-600 px-3 py-1 text-sm font-semibold text-white disabled:opacity-50";

function SettingsPage() {
	const { organization, member } = Route.useRouteContext();
	const { members, roles, invites } = Route.useLoaderData();
	const router = useRouter();
	const [errors, setErrors] = useState<string[]>([]);
	const perms = member.permissions;

	/** 操作を 1 回行い、できたら画面を読み直す */
	const run: Run = async (action) => {
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
			{members && (
				<MembersSection
					orgSlug={organization.slug}
					members={members}
					roles={roles}
					canManage={hasPermission(perms, "member.manage")}
					run={run}
				/>
			)}
			{hasPermission(perms, "role.manage") && (
				<RolesSection
					orgSlug={organization.slug}
					roles={roles}
					myPermissions={perms}
					run={run}
				/>
			)}
			{invites && (
				<InvitesSection
					orgSlug={organization.slug}
					invites={invites}
					grantableRoles={roles.filter((role) => role.grantable)}
					run={run}
				/>
			)}
		</main>
	);
}

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

function RoleChip({ role }: { role: { name: string; color: string } }) {
	return (
		<span className="inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs">
			<span
				aria-hidden
				className="inline-block h-2 w-2 rounded-full"
				style={{ backgroundColor: role.color }}
			/>
			{role.name}
		</span>
	);
}

function MembersSection({
	orgSlug,
	members,
	roles,
	canManage,
	run,
}: {
	orgSlug: string;
	members: {
		id: string;
		isOwner: boolean;
		displayName: string;
		roleIds: string[];
		isMe: boolean;
	}[];
	roles: RoleRow[];
	canManage: boolean;
	run: Run;
}) {
	const setRoles = useServerFn(setMemberRolesFn);
	const remove = useServerFn(removeMember);
	const id = useId();
	const roleById = new Map(roles.map((role) => [role.id, role]));
	return (
		<section className={section} aria-labelledby={`${id}-h`}>
			<h2 id={`${id}-h`} className={heading}>
				メンバー（{members.length} 人）
			</h2>
			<ul className="divide-y rounded border">
				{members.map((m) => {
					const memberRoles = m.roleIds
						.map((roleId) => roleById.get(roleId))
						.filter((role): role is RoleRow => Boolean(role));
					const editable = canManage && !m.isOwner;
					return (
						<li key={m.id} className="space-y-2 px-3 py-2 text-sm">
							<div className="flex flex-wrap items-center gap-2">
								<span className="font-semibold">
									{m.displayName}
									{m.isMe && "（あなた）"}
								</span>
								{m.isOwner ? (
									<RoleChip role={{ name: "オーナー", color: "#F59E0B" }} />
								) : memberRoles.length === 0 ? (
									<span className="text-xs text-gray-500">ロールなし</span>
								) : (
									memberRoles.map((role) => (
										<RoleChip key={role.id} role={role} />
									))
								)}
								{editable && (
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
								)}
							</div>
							{editable && (
								<fieldset className="flex flex-wrap gap-3">
									<legend className="sr-only">{m.displayName}のロール</legend>
									{roles.map((role) => {
										const checked = m.roleIds.includes(role.id);
										return (
											<label
												key={role.id}
												className={`flex items-center gap-1 text-xs ${role.grantable ? "" : "text-gray-400"}`}
												title={
													role.grantable
														? undefined
														: "自分が持っていない権限を含むので、付け外しできません"
												}
											>
												<input
													type="checkbox"
													checked={checked}
													disabled={!role.grantable}
													onChange={() =>
														void run(() =>
															setRoles({
																data: {
																	orgSlug,
																	memberId: m.id,
																	roleIds: checked
																		? m.roleIds.filter((r) => r !== role.id)
																		: [...m.roleIds, role.id],
																},
															}),
														)
													}
												/>
												{role.name}
											</label>
										);
									})}
								</fieldset>
							)}
						</li>
					);
				})}
			</ul>
		</section>
	);
}

function PermissionCheckboxes({
	value,
	onChange,
	myPermissions,
	disabled,
}: {
	value: Permission[];
	onChange: (value: Permission[]) => void;
	myPermissions: readonly Permission[];
	disabled?: boolean;
}) {
	return (
		<div className="grid gap-1 sm:grid-cols-2">
			{PERMISSIONS.map((p) => {
				const mine = myPermissions.includes(p.key);
				return (
					<label
						key={p.key}
						className={`flex items-center gap-2 text-xs ${mine && !disabled ? "" : "text-gray-400"}`}
						title={mine ? undefined : "自分が持っていない権限は付けられません"}
					>
						<input
							type="checkbox"
							checked={value.includes(p.key)}
							disabled={disabled || !mine}
							onChange={(event) =>
								onChange(
									event.target.checked
										? [...value, p.key]
										: value.filter((key) => key !== p.key),
								)
							}
						/>
						{p.label}
					</label>
				);
			})}
		</div>
	);
}

function RoleEditor({
	orgSlug,
	role,
	myPermissions,
	run,
}: {
	orgSlug: string;
	role?: RoleRow;
	myPermissions: readonly Permission[];
	run: Run;
}) {
	const create = useServerFn(createRoleFn);
	const update = useServerFn(updateRoleFn);
	const remove = useServerFn(deleteRoleFn);
	const id = useId();
	const [name, setName] = useState(role?.name ?? "");
	const [color, setColor] = useState(role?.color ?? "#6B7280");
	const [permissions, setPermissions] = useState<Permission[]>(
		role?.permissions ?? ["shift.view", "member.view"],
	);
	// 自分より強いロール（自分にない権限を含む）は、見るだけ
	const locked = role !== undefined && !role.grantable;

	const submit = async (event: FormEvent<HTMLFormElement>) => {
		event.preventDefault();
		const input = { name, color, permissions };
		const ok = await run(() =>
			role
				? update({ data: { orgSlug, roleId: role.id, role: input } })
				: create({ data: { orgSlug, role: input } }),
		);
		if (ok && !role) {
			setName("");
			setPermissions(["shift.view", "member.view"]);
		}
	};

	return (
		<form onSubmit={submit} className="space-y-2 rounded border p-3">
			<div className="flex flex-wrap items-center gap-2">
				<label htmlFor={`${id}-name`} className="sr-only">
					ロール名
				</label>
				<input
					id={`${id}-name`}
					required
					maxLength={40}
					placeholder="ロール名"
					value={name}
					disabled={locked}
					onChange={(event) => setName(event.target.value)}
					className={control}
				/>
				<label htmlFor={`${id}-color`} className="sr-only">
					色
				</label>
				<input
					id={`${id}-color`}
					type="color"
					value={color}
					disabled={locked}
					onChange={(event) => setColor(event.target.value)}
					className="h-8 w-10 rounded border"
				/>
				{role && (
					<span className="text-xs text-gray-600">{role.memberCount} 人</span>
				)}
				{locked && (
					<span className="text-xs text-gray-600">
						自分が持っていない権限を含むので、変えられません
					</span>
				)}
			</div>
			<PermissionCheckboxes
				value={permissions}
				onChange={setPermissions}
				myPermissions={myPermissions}
				disabled={locked}
			/>
			{!locked && (
				<div className="flex gap-3">
					<button type="submit" className={primary}>
						{role ? "保存" : "ロールを作る"}
					</button>
					{role && (
						<button
							type="button"
							onClick={() =>
								void run(() => remove({ data: { orgSlug, roleId: role.id } }))
							}
							className="text-sm text-red-700 underline"
						>
							消す
						</button>
					)}
				</div>
			)}
		</form>
	);
}

function RolesSection({
	orgSlug,
	roles,
	myPermissions,
	run,
}: {
	orgSlug: string;
	roles: RoleRow[];
	myPermissions: readonly Permission[];
	run: Run;
}) {
	const id = useId();
	return (
		<section className={section} aria-labelledby={`${id}-h`}>
			<h2 id={`${id}-h`} className={heading}>
				ロール
			</h2>
			<p className="text-sm text-gray-600">
				ロールごとに権限を決めます。1
				人が複数のロールを持て、権限は足し合わせになります。オーナーは常に全権限です。
				自分が持っていない権限は、ロールに付けたり人に渡したりできません。
			</p>
			{roles.map((role) => (
				<RoleEditor
					key={`${role.id}-${role.permissions.join()}-${role.name}-${role.color}`}
					orgSlug={orgSlug}
					role={role}
					myPermissions={myPermissions}
					run={run}
				/>
			))}
			<h3 className="text-sm font-semibold">新しいロール</h3>
			<RoleEditor orgSlug={orgSlug} myPermissions={myPermissions} run={run} />
		</section>
	);
}

type InviteRow = {
	id: string;
	code: string;
	maxUses: number | null;
	uses: number;
	expiresAt: Date;
	revokedAt: Date | null;
	role: { id: string; name: string; color: string };
};

function InvitesSection({
	orgSlug,
	invites,
	grantableRoles,
	run,
}: {
	orgSlug: string;
	invites: InviteRow[];
	grantableRoles: RoleRow[];
	run: Run;
}) {
	const create = useServerFn(createInviteFn);
	const revoke = useServerFn(revokeInvite);
	const id = useId();
	const [roleId, setRoleId] = useState(
		grantableRoles.find((role) => role.name === "スタッフ")?.id ??
			grantableRoles[0]?.id ??
			"",
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
					roleId,
					maxUses: unlimited ? null : maxUses,
					expiresInDays,
				},
			}),
		);
	};

	const copy = async (code: string) => {
		await navigator.clipboard.writeText(
			`${window.location.origin}/join?code=${encodeURIComponent(code)}`,
		);
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
					参加したときに付けるロール
					<select
						id={`${id}-role`}
						value={roleId}
						onChange={(event) => setRoleId(event.target.value)}
						className={control}
					>
						{grantableRoles.map((role) => (
							<option key={role.id} value={role.id}>
								{role.name}
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
				<button type="submit" disabled={!roleId} className={primary}>
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
								<RoleChip role={invite.role} />
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
