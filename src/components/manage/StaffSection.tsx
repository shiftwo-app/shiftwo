import { useServerFn } from "@tanstack/react-start";
import { useId, useState } from "react";
import type { FormEvent } from "react";
import { NAME_MAX_LENGTH } from "../../lib/profile";
import {
	createStaffFn,
	deleteStaffFn,
	updateStaffFn,
} from "../../server/manage.functions";
import ConfirmButton from "./ConfirmButton";
import type { RunMutation } from "./useMutationRunner";

type StaffRow = {
	id: string;
	name: string;
	memberId: string | null;
	shiftCount: number;
};
type MemberOption = { id: string; displayName: string };

const control = "rounded border px-2 py-1";
const primary =
	"rounded bg-blue-600 px-3 py-1 text-sm font-semibold text-white disabled:opacity-50";

function StaffForm({
	orgSlug,
	staff,
	members,
	takenMemberIds,
	run,
}: {
	orgSlug: string;
	staff?: StaffRow;
	members: MemberOption[];
	takenMemberIds: Set<string>;
	run: RunMutation;
}) {
	const create = useServerFn(createStaffFn);
	const update = useServerFn(updateStaffFn);
	const remove = useServerFn(deleteStaffFn);
	const id = useId();
	const [name, setName] = useState(staff?.name ?? "");
	const [memberId, setMemberId] = useState<string | null>(
		staff?.memberId ?? null,
	);

	const submit = async (event: FormEvent<HTMLFormElement>) => {
		event.preventDefault();
		const input = { name, memberId };
		const ok = await run(() =>
			staff
				? update({ data: { orgSlug, staffId: staff.id, staff: input } })
				: create({ data: { orgSlug, staff: input } }),
		);
		if (ok && !staff) {
			setName("");
			setMemberId(null);
		}
	};

	return (
		<form
			onSubmit={submit}
			className="flex flex-wrap items-center gap-2 text-sm"
		>
			<label htmlFor={`${id}-name`} className="sr-only">
				スタッフの名前
			</label>
			<input
				id={`${id}-name`}
				required
				maxLength={NAME_MAX_LENGTH}
				placeholder="スタッフの名前"
				value={name}
				onChange={(event) => setName(event.target.value)}
				className={control}
			/>
			<label htmlFor={`${id}-member`} className="flex items-center gap-1">
				紐づくメンバー
				<select
					id={`${id}-member`}
					value={memberId ?? ""}
					onChange={(event) => setMemberId(event.target.value || null)}
					className={control}
				>
					<option value="">紐づけない</option>
					{members.map((member) => (
						<option
							key={member.id}
							value={member.id}
							disabled={
								takenMemberIds.has(member.id) && member.id !== staff?.memberId
							}
						>
							{member.displayName}
						</option>
					))}
				</select>
			</label>
			<button type="submit" className={primary}>
				{staff ? "保存" : "スタッフを足す"}
			</button>
			{staff && (
				<ConfirmButton
					label="消す"
					confirmLabel={`本当に消す（シフト ${staff.shiftCount} 件も消えます）`}
					onConfirm={() =>
						void run(() => remove({ data: { orgSlug, staffId: staff.id } }))
					}
				/>
			)}
		</form>
	);
}

/**
 * 団体の設定のスタッフの欄。スタッフは団体全体で共通。
 * 団体のメンバー（アカウント）と紐づけておくと、アイコンなどに使える
 */
const StaffSection = ({
	orgSlug,
	staffs,
	members,
	run,
}: {
	orgSlug: string;
	staffs: StaffRow[];
	members: MemberOption[];
	run: RunMutation;
}) => {
	const taken = new Set(
		staffs.map((s) => s.memberId).filter((v): v is string => v !== null),
	);
	return (
		<section className="space-y-3">
			<h2 className="text-lg font-semibold">スタッフ（{staffs.length}）</h2>
			<p className="text-sm text-gray-600">
				シフトに入る人です。団体のメンバー（アカウント）と紐づけておくと、アイコンなどに使えます。
			</p>
			<div className="space-y-2">
				{staffs.map((staff) => (
					<StaffForm
						key={`${staff.id}-${staff.name}-${staff.memberId}`}
						orgSlug={orgSlug}
						staff={staff}
						members={members}
						takenMemberIds={taken}
						run={run}
					/>
				))}
				<div className="rounded border border-dashed p-2">
					<StaffForm
						orgSlug={orgSlug}
						members={members}
						takenMemberIds={taken}
						run={run}
					/>
				</div>
			</div>
		</section>
	);
};

export default StaffSection;
