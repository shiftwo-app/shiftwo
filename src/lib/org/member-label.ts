import { type Translate, translatorFor } from "../i18n/translate";

/**
 * メンバーのロールの見せ方（オーナーは「オーナー」、ほかは持っているロール名を並べる）。
 * t を渡すとその言語で（渡さなければ日本語）。ロール名は団体が付けたものなので、そのまま出す
 */
export const memberRoleLabel = (
	member: {
		isOwner: boolean;
		roleNames?: readonly string[];
		roles?: readonly { name: string }[];
	},
	t: Translate = translatorFor("ja"),
): string => {
	if (member.isOwner) return t("settings.ownerLabel");
	const names = member.roleNames ?? member.roles?.map((r) => r.name) ?? [];
	return names.length > 0
		? names.join(t("settings.roleSeparator"))
		: t("settings.noRoles");
};
