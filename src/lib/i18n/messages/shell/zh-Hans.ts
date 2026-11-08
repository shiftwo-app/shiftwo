import type { Messages } from "../define";
import type ja from "./ja";

export default {
	pageTitle: "{page} | Shiftwo",
	notFoundTitle: "找不到页面",
	notFoundBody:
		"页面不存在，或者你没有查看权限。如果是组织的页面，请确认你已加入该组织。",
	notFoundBackHome: "返回首页",
	homeLinkLabel: "Shiftwo（前往组织列表）",
	signOut: "退出登录",
	orgFallbackName: "组织",
	menuLabel: "{name}的菜单",
	tabPublished: "已确定班次",
	tabDraft: "草稿",
	tabEventSettings: "活动设置",
	tabRegular: "日常班次",
	tabEvents: "活动（{count}）",
	tabTenantSettings: "地点设置",
	tabTop: "首页",
	tabPreferences: "意愿",
	tabSettingsMembers: "设置与成员",
	breadcrumbLabel: "当前位置",
	memberWithRole: "{name}（{role}）",
} satisfies Messages<typeof ja>;
