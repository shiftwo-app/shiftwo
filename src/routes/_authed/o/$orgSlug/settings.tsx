import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import Avatar from "../../../../components/Avatar";
import AvatarUploader from "../../../../components/AvatarUploader";
import DiscordGuildSection from "../../../../components/manage/DiscordGuildSection";
import PositionsToggle from "../../../../components/manage/PositionsToggle";
import StaffSection from "../../../../components/manage/StaffSection";
import TenantsSection from "../../../../components/manage/TenantsSection";
import ErrorList from "../../../../components/manage/ErrorList";
import Badge from "../../../../components/ui/Badge";
import Button from "../../../../components/ui/Button";
import PageHeader from "../../../../components/ui/PageHeader";
import Section from "../../../../components/ui/Section";
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
	getMyOrgAvatar,
	listInvites,
	listMembers,
	listRoles,
	removeMember,
	revokeInvite,
	setMemberRolesFn,
	updateMyDisplayName,
	updateRoleFn,
} from "../../../../server/org.functions";
import { listStaffFn } from "../../../../server/manage.functions";

export const Route = createFileRoute("/_authed/o/$orgSlug/settings")({
	loader: async ({ params, context }) => {
		const perms = context.member.permissions;
		const orgSlug = params.orgSlug;
		const [myAvatar, members, roles, invites, staff] = await Promise.all([
			getMyOrgAvatar({ data: { orgSlug } }),
			hasPermission(perms, "member.view")
				? listMembers({ data: { orgSlug } })
				: Promise.resolve(null),
			hasPermission(perms, "member.view")
				? listRoles({ data: { orgSlug } })
				: Promise.resolve([]),
			hasPermission(perms, "invite.manage")
				? listInvites({ data: { orgSlug } })
				: Promise.resolve(null),
			hasPermission(perms, "staff.manage")
				? listStaffFn({ data: { orgSlug } })
				: Promise.resolve(null),
		]);
		return { myAvatar, members, roles, invites, staff };
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

// 一覧の入れ物（罫線で行を区切る）
const listBox = "divide-y divide-line rounded-lg border border-line bg-surface";
// 新しく作るフォームの入れ物（点線の枠で「ここに足す」と分かるように）
const newBox =
	"space-y-3 rounded-lg border border-dashed border-line-strong p-4";
const fieldLabel = "flex flex-col gap-1 text-sm font-bold text-ink";

/** ロールの付け外しのチェックボックスの札（チェックボックス・色の点・名前） */
const roleToggleClass = (enabled: boolean, checked: boolean) =>
	`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs leading-5 ${
		enabled
			? `cursor-pointer text-ink ${checked ? "border-primary/40 bg-primary-soft" : "border-line bg-surface hover:border-line-strong"}`
			: "cursor-not-allowed border-line bg-surface-sunken text-ink-muted"
	}`;

/** 色の入力欄。ブラウザのものをそのまま使い、まわりの枠だけ入力欄にそろえる */
function ColorInput({
	id,
	value,
	disabled,
	onChange,
}: {
	id: string;
	value: string;
	disabled?: boolean;
	onChange: (value: string) => void;
}) {
	return (
		<span
			className={`inline-flex h-[2.125rem] w-11 shrink-0 items-center justify-center rounded-md border border-line-strong focus-within:border-primary ${disabled ? "bg-surface-sunken" : "bg-surface hover:border-ink-muted"}`}
		>
			<input
				id={id}
				type="color"
				value={value}
				disabled={disabled}
				onChange={(event) => onChange(event.target.value)}
				className="h-6 w-8 cursor-pointer rounded-sm border-0 bg-transparent p-0 disabled:cursor-not-allowed"
			/>
		</span>
	);
}

function SettingsPage() {
	const { organization, member, tenants } = Route.useRouteContext();
	const { myAvatar, members, roles, invites, staff } = Route.useLoaderData();
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
		<main className="mx-auto max-w-5xl px-4 py-6 sm:px-6">
			<PageHeader title="設定・メンバー" />
			<ErrorList errors={errors} className="mb-6" />
			<div>
				<DisplayNameSection
					orgSlug={organization.slug}
					current={member.displayName}
					run={run}
				/>
				{myAvatar && (
					<Section
						id="org-avatar-h"
						title="この団体でのあなたのアイコン"
						description="選ぶと、この団体でだけこのアイコンを使います（ほかの団体やアカウントのアイコンは変わりません）。"
					>
						<AvatarUploader
							endpoint={`/api/o/${encodeURIComponent(organization.slug)}/me/avatar`}
							name={member.displayName}
							currentUrl={myAvatar.avatarUrl}
							hasUploaded={myAvatar.hasOrgAvatar}
							removeLabel="アカウントのアイコンに戻す"
							onChanged={() => router.invalidate()}
						/>
					</Section>
				)}
				{hasPermission(perms, "org.settings") && (
					<DiscordGuildSection orgSlug={organization.slug} run={run} />
				)}
				{hasPermission(perms, "org.settings") && (
					<Section
						id="org-positions-h"
						title="持ち場"
						description="使わないときは、シフトを人と時間だけで組みます（持ち場の選択・持ち場別の表示・必要な人数・希望の持ち場を出しません）。団体の基本の設定で、テナントやイベントごとに変えられます。"
					>
						<PositionsToggle
							scope={{ orgSlug: organization.slug }}
							value={organization.positionsEnabled}
							run={run}
						/>
					</Section>
				)}
				{hasPermission(perms, "tenant.manage") && (
					<TenantsSection
						orgSlug={organization.slug}
						tenants={tenants}
						run={run}
					/>
				)}
				{staff && (
					<StaffSection
						orgSlug={organization.slug}
						staffs={staff.staffs}
						members={staff.members}
						canLinkMembers={staff.canLinkMembers}
						run={run}
					/>
				)}
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
						grantableRoles={roles.filter((role) => role.invitable)}
						run={run}
					/>
				)}
			</div>
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
		<Section id={`${id}-h`} title="この団体でのあなたの表示名">
			<form onSubmit={submit} className="flex flex-col gap-1">
				<label htmlFor={`${id}-input`} className="text-sm font-bold text-ink">
					表示名
				</label>
				<div className="flex flex-wrap items-center gap-2">
					<input
						id={`${id}-input`}
						required
						maxLength={NAME_MAX_LENGTH}
						value={value}
						onChange={(event) => setValue(event.target.value)}
						className="control min-w-0 flex-1 sm:max-w-xs"
					/>
					<Button type="submit" variant="primary">
						変える
					</Button>
				</div>
			</form>
		</Section>
	);
}

function RoleChip({ role }: { role: { name: string; color: string } }) {
	return <Badge color={role.color}>{role.name}</Badge>;
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
		avatarUrl: string | null;
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
		<Section id={`${id}-h`} title={`メンバー（${members.length} 人）`}>
			<ul className={listBox}>
				{members.map((m) => {
					const memberRoles = m.roleIds
						.map((roleId) => roleById.get(roleId))
						.filter((role): role is RoleRow => Boolean(role));
					const editable = canManage && !m.isOwner;
					return (
						<li key={m.id} className="space-y-3 px-4 py-3 text-sm">
							<div className="flex items-start gap-3">
								<Avatar name={m.displayName} url={m.avatarUrl} size={32} />
								<div className="min-w-0 flex-1 space-y-1">
									<p className="font-bold text-ink">
										{m.displayName}
										{m.isMe && (
											<span className="font-normal text-ink-muted">
												（あなた）
											</span>
										)}
									</p>
									<div className="flex flex-wrap gap-1.5">
										{m.isOwner ? (
											<RoleChip role={{ name: "オーナー", color: "#F59E0B" }} />
										) : memberRoles.length === 0 ? (
											<span className="text-xs text-ink-muted">ロールなし</span>
										) : (
											memberRoles.map((role) => (
												<RoleChip key={role.id} role={role} />
											))
										)}
									</div>
								</div>
								{editable && (
									<Button
										variant="danger"
										size="sm"
										className="shrink-0"
										onClick={() =>
											void run(() =>
												remove({ data: { orgSlug, memberId: m.id } }),
											)
										}
									>
										外す
									</Button>
								)}
							</div>
							{editable && (
								<fieldset className="flex flex-wrap gap-2 sm:pl-11">
									<legend className="sr-only">{m.displayName}のロール</legend>
									{roles.map((role) => {
										const checked = m.roleIds.includes(role.id);
										return (
											<label
												key={role.id}
												className={roleToggleClass(role.grantable, checked)}
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
													className="size-3.5 accent-primary"
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
												<span
													aria-hidden="true"
													className="size-2 rounded-full"
													style={{ backgroundColor: role.color }}
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
		</Section>
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
		<div className="grid gap-x-6 gap-y-1 md:grid-cols-2">
			{PERMISSIONS.map((p) => {
				const mine = myPermissions.includes(p.key);
				return (
					<label
						key={p.key}
						className={`flex items-start gap-2 rounded-md px-1.5 py-1 text-sm leading-snug ${mine && !disabled ? "cursor-pointer text-ink hover:bg-surface-sunken" : "cursor-not-allowed text-ink-muted"}`}
						title={mine ? undefined : "自分が持っていない権限は付けられません"}
					>
						<input
							type="checkbox"
							className="mt-0.5 size-4 shrink-0 accent-primary"
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
		<form onSubmit={submit} className="space-y-3">
			<div className="flex flex-wrap items-end gap-x-3 gap-y-2">
				<div className="flex flex-col gap-1">
					<label
						htmlFor={`${id}-color`}
						className={role ? "sr-only" : "text-sm font-bold text-ink"}
					>
						色
					</label>
					<ColorInput
						id={`${id}-color`}
						value={color}
						disabled={locked}
						onChange={setColor}
					/>
				</div>
				<div className="flex min-w-40 flex-1 flex-col gap-1 sm:max-w-xs">
					<label
						htmlFor={`${id}-name`}
						className={role ? "sr-only" : "text-sm font-bold text-ink"}
					>
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
						className="control w-full"
					/>
				</div>
				{role && (
					<span className="tabular pb-2 text-xs text-ink-muted">
						{role.memberCount} 人
					</span>
				)}
			</div>
			{locked && (
				<p className="text-xs text-ink-muted">
					自分が持っていない権限を含むので、変えられません
				</p>
			)}
			<PermissionCheckboxes
				value={permissions}
				onChange={setPermissions}
				myPermissions={myPermissions}
				disabled={locked}
			/>
			{!locked && (
				<div className="flex flex-wrap items-center gap-2">
					<Button
						type="submit"
						variant={role ? "secondary" : "primary"}
						size={role ? "sm" : "md"}
					>
						{role ? "保存" : "ロールを作る"}
					</Button>
					{role && (
						<Button
							variant="danger"
							size="sm"
							onClick={() =>
								void run(() => remove({ data: { orgSlug, roleId: role.id } }))
							}
						>
							消す
						</Button>
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
		<Section
			id={`${id}-h`}
			title="ロール"
			description={
				<>
					ロールごとに権限を決めます。1
					人が複数のロールを持て、権限は足し合わせになります。オーナーは常に全権限です。
					自分が持っていない権限は、ロールに付けたり人に渡したりできません。
				</>
			}
		>
			{roles.length > 0 && (
				<ul className={listBox}>
					{roles.map((role) => (
						<li
							key={`${role.id}-${role.permissions.join()}-${role.name}-${role.color}`}
							className="px-4 py-4"
						>
							<RoleEditor
								orgSlug={orgSlug}
								role={role}
								myPermissions={myPermissions}
								run={run}
							/>
						</li>
					))}
				</ul>
			)}
			<div className={newBox}>
				<h3 className="text-sm font-bold text-ink">新しいロール</h3>
				<RoleEditor orgSlug={orgSlug} myPermissions={myPermissions} run={run} />
			</div>
		</Section>
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
		<Section id={`${id}-h`} title="招待コード">
			<form onSubmit={submit} className={newBox}>
				<div className="flex flex-wrap items-end gap-x-4 gap-y-3">
					<label className={`${fieldLabel} min-w-40`} htmlFor={`${id}-role`}>
						参加したときに付けるロール
						<select
							id={`${id}-role`}
							value={roleId}
							onChange={(event) => setRoleId(event.target.value)}
							className="control font-normal"
						>
							{grantableRoles.map((role) => (
								<option key={role.id} value={role.id}>
									{role.name}
								</option>
							))}
						</select>
					</label>
					<div className="flex flex-wrap items-end gap-x-3 gap-y-2">
						<label className={fieldLabel} htmlFor={`${id}-uses`}>
							使える回数
							<input
								id={`${id}-uses`}
								type="number"
								min={1}
								max={INVITE_MAX_USES_LIMIT}
								disabled={unlimited}
								value={maxUses}
								onChange={(event) => setMaxUses(Number(event.target.value))}
								className="control tabular w-24 font-normal"
							/>
						</label>
						<label className="flex cursor-pointer items-center gap-2 pb-2 text-sm text-ink">
							<input
								type="checkbox"
								checked={unlimited}
								onChange={(event) => setUnlimited(event.target.checked)}
								className="size-4 accent-primary"
							/>
							制限なし
						</label>
					</div>
					<label className={fieldLabel} htmlFor={`${id}-days`}>
						有効期限（日）
						<input
							id={`${id}-days`}
							type="number"
							min={1}
							max={INVITE_MAX_EXPIRES_DAYS}
							value={expiresInDays}
							onChange={(event) => setExpiresInDays(Number(event.target.value))}
							className="control tabular w-24 font-normal"
						/>
					</label>
				</div>
				<Button type="submit" variant="primary" disabled={!roleId}>
					発行する
				</Button>
			</form>
			{invites.length === 0 ? (
				<p className="text-sm text-ink-muted">まだ招待コードはありません。</p>
			) : (
				<ul className={`${listBox} text-sm`}>
					{invites.map((invite) => {
						const reason = inviteUnusableReason(invite);
						return (
							<li
								key={invite.id}
								className="flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3"
							>
								<div className="min-w-0 space-y-1">
									<div className="flex flex-wrap items-center gap-2">
										<span
											className={`font-mono text-base tracking-wider ${reason ? "text-ink-muted line-through" : "text-ink"}`}
										>
											{formatInviteCode(invite.code)}
										</span>
										<RoleChip role={invite.role} />
									</div>
									<p className="tabular flex flex-wrap gap-x-3 text-xs text-ink-muted">
										<span>
											{invite.uses}/{invite.maxUses ?? "∞"} 回
										</span>
										<span>
											{reason === "revoked"
												? "取り消し済み"
												: reason === "expired"
													? "期限切れ"
													: reason === "used_up"
														? "使い切り"
														: `${dateFormatter.format(invite.expiresAt)} まで`}
										</span>
									</p>
								</div>
								{!reason && (
									<span className="ml-auto flex flex-wrap gap-2">
										<Button
											variant="secondary"
											size="sm"
											onClick={() => void copy(invite.code)}
										>
											{copied === invite.code
												? "コピーしました"
												: "参加用のリンクをコピー"}
										</Button>
										<Button
											variant="danger"
											size="sm"
											onClick={() =>
												void run(() =>
													revoke({ data: { orgSlug, inviteId: invite.id } }),
												)
											}
										>
											取り消す
										</Button>
									</span>
								)}
							</li>
						);
					})}
				</ul>
			)}
		</Section>
	);
}
