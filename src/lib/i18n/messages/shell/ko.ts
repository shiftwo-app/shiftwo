import type { Messages } from "../define";
import type ja from "./ja";

export default {
	pageTitle: "{page} | Shiftwo",
	notFoundTitle: "찾을 수 없어요",
	notFoundBody:
		"페이지가 없거나 볼 권한이 없어요. 단체 페이지라면 그 단체에 참여하고 있는지 확인해 주세요.",
	notFoundBackHome: "홈으로",
	homeLinkLabel: "Shiftwo (단체 목록으로)",
	signOut: "로그아웃",
	orgFallbackName: "단체",
	menuLabel: "{name} 메뉴",
	tabPublished: "확정 근무",
	tabDraft: "초안",
	tabEventSettings: "이벤트 설정",
	tabRegular: "일상 근무",
	tabEvents: "이벤트 ({count})",
	tabTenantSettings: "장소 설정",
	tabTop: "홈",
	tabPreferences: "희망 사항",
	tabSettingsMembers: "설정·멤버",
	breadcrumbLabel: "현재 위치",
	memberWithRole: "{name} ({role})",
	menuOpen: "메뉴 열기",
	menuClose: "메뉴 닫기",
	menuTitle: "메뉴",
	menuAccount: "계정",
} satisfies Messages<typeof ja>;
