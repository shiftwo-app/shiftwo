import type { Messages } from "../define";
import type ja from "./ja";

export default {
	pageTitle: "{page} | Shiftwo",
	notFoundTitle: "找不到頁面",
	notFoundBody:
		"頁面不存在，或者你沒有檢視權限。如果是組織的頁面，請確認你已加入該組織。",
	notFoundBackHome: "返回首頁",
	homeLinkLabel: "Shiftwo（前往組織列表）",
	signOut: "登出",
	orgFallbackName: "組織",
	menuLabel: "{name}的選單",
	tabPublished: "已確定班次",
	tabDraft: "草稿",
	tabEventSettings: "活動設定",
	tabRegular: "日常班次",
	tabEvents: "活動（{count}）",
	tabTenantSettings: "地點設定",
	tabTop: "首頁",
	tabPreferences: "意願",
	tabSettingsMembers: "設定與成員",
	breadcrumbLabel: "目前位置",
	memberWithRole: "{name}（{role}）",
	menuOpen: "開啟選單",
	menuClose: "關閉選單",
	menuTitle: "選單",
	menuAccount: "帳戶",
} satisfies Messages<typeof ja>;
