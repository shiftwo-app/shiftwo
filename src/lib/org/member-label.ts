/** メンバーのロールの見せ方（オーナーは「オーナー」、ほかは持っているロール名を並べる） */
export const memberRoleLabel = (member: {
	isOwner: boolean;
	roleNames?: readonly string[];
	roles?: readonly { name: string }[];
}): string => {
	if (member.isOwner) return "オーナー";
	const names = member.roleNames ?? member.roles?.map((r) => r.name) ?? [];
	return names.length > 0 ? names.join("・") : "ロールなし";
};
