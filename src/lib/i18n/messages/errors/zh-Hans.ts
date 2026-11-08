import type { Messages } from "../define";
import type ja from "./ja";

export default {
	saveFailed: "无法保存。请稍后再试一次。",
	failedShort: "操作失败",
	forbiddenGrant: "不能分配或授予包含你自己没有的权限的角色",
	roleConcurrentChange: "其他人同时修改了此角色。请刷新页面后再试一次。",
	roleNotFound: "找不到角色",
	roleUpdateForbidden: "不能修改包含你自己没有的权限的角色",
	roleDeleteForbidden: "不能删除包含你自己没有的权限的角色",
	memberNotFound: "找不到成员",
	ownerRolesFixed: "不能修改所有者的角色（所有者始终拥有全部权限）",
	orgNotFound: "找不到组织",
	ownerCannotBeRemoved: "不能移除所有者",
	memberRemoveForbidden: "不能移除拥有你自己没有的权限的成员",
	roleNameRequired: "请输入角色名称",
	roleNameTooLong: "角色名称最多 40 个字符",
	roleColorInvalid: "请以 #RRGGBB 的格式指定颜色",
	discordLinkFirst: "请先在账号设置中关联 Discord",
	discordGuildNotFound: "找不到该服务器（只能选择你已加入的服务器）",
} satisfies Messages<typeof ja>;
