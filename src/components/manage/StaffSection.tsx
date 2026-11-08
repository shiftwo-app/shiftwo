import { useServerFn } from "@tanstack/react-start";
import { useId, useState } from "react";
import type { FormEvent } from "react";
import { NAME_MAX_LENGTH } from "../../lib/profile";
import {
	createStaffFn,
	deleteStaffFn,
	updateStaffFn,
} from "../../server/manage.functions";
import Button from "../ui/Button";
import Section from "../ui/Section";
import ConfirmButton from "./ConfirmButton";
import type { RunMutation } from "./useMutationRunner";

type StaffRow = {
	id: string;
	name: string;
	memberId: string | null;
	shiftCount: number;
};
type MemberOption = { id: string; displayName: string };

// 一覧の行ではラベルを隠し（列が並んで読めるので）、新しく足すフォームでは見せる
const labelClass = (visible: boolean) =>
	visible ? "text-sm font-bold text-ink" : "sr-only";

function StaffForm({
	orgSlug,
	staff,
	members,
	takenMemberIds,
	canLinkMembers,
	run,
}: {
	orgSlug: string;
	staff?: StaffRow;
	members: MemberOption[];
	takenMemberIds: Set<string>;
	canLinkMembers: boolean;
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

	const isNew = !staff;
	return (
		<form
			onSubmit={submit}
			className="flex flex-wrap items-end gap-x-3 gap-y-2 text-sm"
		>
			<div className="flex min-w-40 flex-1 flex-col gap-1">
				<label htmlFor={`${id}-name`} className={labelClass(isNew)}>
					スタッフの名前
				</label>
				<input
					id={`${id}-name`}
					required
					maxLength={NAME_MAX_LENGTH}
					placeholder="スタッフの名前"
					value={name}
					onChange={(event) => setName(event.target.value)}
					className="control w-full"
				/>
			</div>
			{canLinkMembers && (
				<div className="flex min-w-40 flex-1 flex-col gap-1 sm:max-w-56">
					<label htmlFor={`${id}-member`} className={labelClass(isNew)}>
						紐づくメンバー
					</label>
					<select
						id={`${id}-member`}
						value={memberId ?? ""}
						onChange={(event) => setMemberId(event.target.value || null)}
						className="control w-full"
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
				</div>
			)}
			<div className="flex flex-wrap items-center gap-2">
				{staff && (
					<span className="tabular text-xs text-ink-muted">
						シフト {staff.shiftCount} 件
					</span>
				)}
				<Button
					type="submit"
					variant={isNew ? "primary" : "secondary"}
					size={isNew ? "md" : "sm"}
				>
					{staff ? "保存" : "スタッフを足す"}
				</Button>
				{staff && (
					<ConfirmButton
						label="消す"
						confirmLabel={`本当に消す（シフト ${staff.shiftCount} 件も消えます）`}
						onConfirm={() =>
							void run(() => remove({ data: { orgSlug, staffId: staff.id } }))
						}
					/>
				)}
			</div>
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
	canLinkMembers,
	run,
}: {
	orgSlug: string;
	staffs: StaffRow[];
	members: MemberOption[];
	/** メンバーを見る権限があるときだけ、紐づけの欄を出す */
	canLinkMembers: boolean;
	run: RunMutation;
}) => {
	const id = useId();
	const taken = new Set(
		staffs.map((s) => s.memberId).filter((v): v is string => v !== null),
	);
	return (
		<Section
			id={`${id}-h`}
			title={`スタッフ（${staffs.length}）`}
			description="シフトに入る人です。団体のメンバー（アカウント）と紐づけておくと、アイコンなどに使えます。"
		>
			{staffs.length > 0 && (
				<ul className="divide-y divide-line rounded-lg border border-line bg-surface">
					{staffs.map((staff) => (
						<li
							key={`${staff.id}-${staff.name}-${staff.memberId}`}
							className="px-4 py-3"
						>
							<StaffForm
								orgSlug={orgSlug}
								staff={staff}
								members={members}
								takenMemberIds={taken}
								canLinkMembers={canLinkMembers}
								run={run}
							/>
						</li>
					))}
				</ul>
			)}
			<div className="rounded-lg border border-dashed border-line-strong p-4">
				<StaffForm
					orgSlug={orgSlug}
					members={members}
					takenMemberIds={taken}
					canLinkMembers={canLinkMembers}
					run={run}
				/>
			</div>
		</Section>
	);
};

export default StaffSection;
