import type { Messages } from "../define";
import type ja from "./ja";

export default {
	pageTitle: "{page} | Shiftwo",
	notFoundTitle: "Not found",
	notFoundBody:
		"This page doesn't exist, or you don't have permission to view it. If it's an organization's page, check that you're a member of that organization.",
	notFoundBackHome: "Back to home",
	homeLinkLabel: "Shiftwo (to your organizations)",
	signOut: "Log out",
	orgFallbackName: "Organization",
	menuLabel: "{name} menu",
	tabPublished: "Published shifts",
	tabDraft: "Draft",
	tabEventSettings: "Event settings",
	tabRegular: "Regular shifts",
	tabEvents: "Events ({count})",
	tabTenantSettings: "Location settings",
	tabTop: "Home",
	tabPreferences: "Preferences",
	tabSettingsMembers: "Settings & members",
	breadcrumbLabel: "You are here",
	memberWithRole: "{name} ({role})",
} satisfies Messages<typeof ja>;
