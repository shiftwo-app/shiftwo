import { useServerFn } from "@tanstack/react-start";
import type { ShiftScopeParams } from "../../lib/shift-scope";
import { setScopedRolesFn } from "../../server/manage.functions";
import type { RunMutation } from "./useMutationRunner";

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
	const setRoles = useServerFn(setScopedRolesFn);
	return (
		<ul className="divide-y rounded border text-sm">
			{assignments.members.map((member) => (
				<li key={member.id} className="space-y-1 px-3 py-2">
					<div className="font-semibold">
						{member.displayName}
						{member.isOwner && (
							<span className="ml-2 text-xs font-normal text-gray-500">
								オーナー（常に全権限）
							</span>
						)}
					</div>
					{!member.isOwner && (
						<fieldset className="flex flex-wrap gap-3">
							<legend className="sr-only">
								{member.displayName}に割り当てるロール
							</legend>
							{assignments.roles.map((role) => {
								const checked = member.roleIds.includes(role.id);
								return (
									<label
										key={role.id}
										className={`flex items-center gap-1 text-xs ${role.grantable ? "" : "text-gray-400"}`}
										title={
											role.grantable
												? undefined
												: "自分が持っていない権限を含むので、割り当てできません"
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
