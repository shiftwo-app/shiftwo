import type { Messages } from "../define";
import type ja from "./ja";

export default {
	saveFailed: "無法儲存。請稍後再試一次。",
	failedShort: "操作失敗",
	forbiddenGrant: "不能指派或授予包含你自己沒有的權限的角色",
	roleConcurrentChange: "其他人同時修改了此角色。請重新整理頁面後再試一次。",
	roleNotFound: "找不到角色",
	roleUpdateForbidden: "不能修改包含你自己沒有的權限的角色",
	roleDeleteForbidden: "不能刪除包含你自己沒有的權限的角色",
	memberNotFound: "找不到成員",
	ownerRolesFixed: "不能修改擁有者的角色（擁有者始終擁有全部權限）",
	orgNotFound: "找不到組織",
	ownerCannotBeRemoved: "不能移除擁有者",
	memberRemoveForbidden: "不能移除擁有你自己沒有的權限的成員",
	roleNameRequired: "請輸入角色名稱",
	roleNameTooLong: "角色名稱最多 40 個字元",
	roleColorInvalid: "請以 #RRGGBB 的格式指定顏色",
	discordLinkFirst: "請先在帳號設定中連結 Discord",
	discordGuildNotFound: "找不到該伺服器（只能選擇你已加入的伺服器）",
} satisfies Messages<typeof ja>;
