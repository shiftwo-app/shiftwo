import { useServerFn } from "@tanstack/react-start";
import type { ShiftScopeParams } from "../../lib/shift-scope";
import { setScopedRolesFn } from "../../server/manage.functions";
import type { RunMutation } from "./useMutationRunner";
import { useT } from "../../lib/i18n/react";

type Assignments = {
	members: {
		id: string;
		displayName: string;
		isOwner: boolean;
		roleIds: string[];
	}[];
	roles: { id: string; name: string; color: string; grantable: boolean }[];
};

/**
 * テナント・イベントで、メンバーにロールを割り当てる（店長など）。
 * 割り当てたロールのシフトに関わる権限だけが、その場面で上乗せされる
 */
const ScopedRolesEditor = ({
	scope,
	assignments,
	run,
}: {
	scope: ShiftScopeParams;
	assignments: Assignments;
	run: RunMutation;
}) => {
	const t = useT();
	const setRoles = useServerFn(setScopedRolesFn);
	return (
		<ul className="divide-y divide-line rounded-lg border border-line bg-surface text-sm">
			{assignments.members.map((member) => (
				<li
					key={member.id}
					className="flex flex-col gap-2 px-4 py-3 md:flex-row md:items-start md:gap-4"
				>
					<div className="min-w-0 md:w-44 md:shrink-0 md:pt-1">
						<span className="block truncate font-bold text-ink">
							{member.displayName}
						</span>
						{member.isOwner && (
							<span className="block text-xs text-ink-muted">
								{t("settings.ownerAllPermissions")}
							</span>
						)}
					</div>
					{!member.isOwner && (
						<fieldset className="flex min-w-0 flex-wrap gap-2">
							<legend className="sr-only">
								{t("settings.scopedRolesLegend", { name: member.displayName })}
							</legend>
							{assignments.roles.map((role) => {
								const checked = member.roleIds.includes(role.id);
								return (
									<label
										key={role.id}
										className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs leading-5 ${
											role.grantable
												? `cursor-pointer text-ink ${checked ? "border-primary/40 bg-primary-soft" : "border-line bg-surface hover:border-line-strong"}`
												: "cursor-not-allowed border-line bg-surface-sunken text-ink-muted"
										}`}
										title={
											role.grantable
												? undefined
												: t("settings.roleNotAssignable")
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
															...scope,
															memberId: member.id,
															roleIds: checked
																? member.roleIds.filter((r) => r !== role.id)
																: [...member.roleIds, role.id],
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
			))}
		</ul>
	);
};

export default ScopedRolesEditor;
