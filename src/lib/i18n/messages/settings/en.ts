import type { Messages } from "../define";
import type ja from "./ja";

export default {
	failedShort: "That didn't work",
	create: "Create",
	color: "Color",
	ownerLabel: "Owner",
	noRoles: "No roles",
	roleSeparator: ", ",
	sameAsTenant: "Same as location",

	orgSettingsTitle: "Settings & members",
	orgAvatarTitle: "Your icon in this organization",
	orgAvatarDescription:
		"If you choose one, it's used only in this organization (your icon in other organizations and your account stays the same).",
	orgAvatarRemove: "Go back to your account icon",
	orgPositionsTitle: "Positions",
	orgPositionsDescription:
		"When turned off, shifts are planned with just people and times (no position picker, per-position view, required staff, or preferred positions). This is the organization default; each location or event can change it.",
	displayNameTitle: "Your display name in this organization",
	displayNameLabel: "Display name",
	displayNameSubmit: "Change",
	membersTitle: "Members ({count})",
	memberYou: " (you)",
	removeMember: "Remove",
	memberRolesLegend: "Roles of {name}",
	roleNotToggleable:
		"You can't add or remove this role because it includes permissions you don't have",
	permissionNotOwned: "You can't grant permissions you don't have",
	roleName: "Role name",
	roleMemberCount: "{count} people",
	roleLocked:
		"You can't change this role because it includes permissions you don't have.",
	roleCreate: "Create role",
	rolesTitle: "Roles",
	rolesDescription:
		"Each role has its own permissions. A person can have several roles, and their permissions add up. Owners always have every permission. You can't add permissions you don't have to a role, or give them to others.",
	newRole: "New role",
	invitesTitle: "Invite codes",
	inviteRole: "Role given on joining",
	inviteMaxUses: "Number of uses",
	inviteUnlimited: "Unlimited",
	inviteExpiresDays: "Expires in (days)",
	inviteIssue: "Create code",
	invitesEmpty: "No invite codes yet.",
	inviteUses: "{uses}/{max} uses",
	inviteRevoked: "Revoked",
	inviteExpired: "Expired",
	inviteUsedUp: "Used up",
	inviteUntil: "Until {date}",
	inviteCopied: "Copied",
	inviteCopyLink: "Copy join link",
	inviteRevoke: "Revoke",

	discordTitle: "Discord server",
	discordDescription:
		"If you set a server, only members of that server can join and see shifts. People with a role that has the exemption permission, such as the guest role, can join even if they aren't members ({link}).",
	discordLearnMore: "learn more",
	discordNotConfigured: "Discord integration isn't available on this Shiftwo.",
	discordCurrent: "Current setting",
	discordMembersOnly: "Only members of {name}",
	discordNoConditionCurrent:
		"No requirement (anyone with an invite code can join)",
	discordLinkFirst: "To choose a server, first link Discord in {link}.",
	discordAccountSettings: "account settings",
	discordGuildsError:
		"Couldn't load your server list from Discord. Try again later, or link Discord again.",
	discordServer: "Server",
	discordNoCondition: "No requirement",
	discordNote:
		"You can only choose servers you're in. Once set, current members are also checked from their next sign-in.",

	positionsToggleTitle: "Use positions",
	positionsToggleDescription:
		"When turned off, shifts are planned with just people and times (no position picker, per-position view, required staff, or preferred positions).",
	positionsOn: "On",
	positionsOff: "Off",
	positionsInheritDefault: "Same as above",
	positionsInheritOption: "{label} ({value})",
	sameAsOrg: "Same as organization",

	tenantsTitle: "Locations ({count})",
	tenantsDescription:
		"A unit you plan shifts for, such as a store. Each location has its own regular shift positions and events.",
	tenantSettingsLink: "Settings",
	tenantCreate: "Create a location (such as a store)",
	tenantSettingsTitle: "Location settings",
	tenantSection: "Location",
	tenantPositionsTitle: "Regular shift positions",
	tenantPositionsDescription:
		"Event positions are set separately in each event's settings.",
	tenantPositionsUnused:
		"This location doesn't use positions. Turn them on to use the positions set here.",
	tenantRolesTitle: "Role assignments in this location",
	tenantRolesDescription:
		"The shift-related permissions (view, edit, and publish shifts; manage positions and events) of roles assigned here are added in this location and its events (for example, a store manager).",
	tenantNoPermission:
		"You don't have permission to change this location's settings.",

	eventsTitle: "Events",
	eventsDescription:
		"Shifts for one-off events are planned separately from regular shifts, with each event's own positions.",
	eventsListTitle: "Events ({count})",
	eventsEmpty: "No events yet.",
	eventsCreate: "Create an event",
	eventSettingsTitle: "Event settings",
	eventSection: "Event",
	eventPositionsTitle: "Positions for this event",
	eventPositionsDescription: "Kept separately from regular shift positions.",
	eventPositionsUnused:
		"This event doesn't use positions. Turn them on to use the positions set here.",
	eventRolesTitle: "Role assignments in this event",
	eventRolesDescription:
		"The shift-related permissions of roles assigned here are added for this event only.",
	eventDeleteTitle: "Delete event",
	eventDeleteDescription:
		"The event's positions and shifts are deleted too. This can't be undone.",
	eventDelete: "Delete this event",
	eventDeleteConfirm:
		"Really delete (event positions and shifts are deleted too)",
	eventNoPermission:
		"You don't have permission to change this event's settings.",

	tenantName: "Location name",
	eventName: "Event name",
	urlName: "URL name",
	urlNameHint: " (lowercase letters, numbers, and hyphens)",
	timeUnit: "Time step",
	minutes: "{minutes} min",

	positionName: "Position name",
	positionNamePlaceholder: "Position name (e.g. Reception)",
	requiredStaffCount: "Staff needed",
	positionCreate: "Create position",
	positionDeleteConfirm:
		"Really delete (shifts for this position are deleted too)",
	positionsEmpty: "No positions yet.",

	ownerAllPermissions: "Owner (always has every permission)",
	scopedRolesLegend: "Roles assigned to {name}",
	roleNotAssignable:
		"You can't assign this role because it includes permissions you don't have",

	staffTitle: "Staff ({count})",
	staffDescription:
		"People who work shifts. Link them to organization members (accounts) to use their icons and more.",
	staffName: "Staff name",
	staffLinkedMember: "Linked member",
	staffNoLink: "Not linked",
	staffShiftCount: "Shifts: {count}",
	staffAdd: "Add staff",
	staffDeleteConfirm: "Really delete ({count} shifts are deleted too)",

	permShiftView: "View shifts",
	permShiftEdit: "Create, change, and delete shifts",
	permShiftConfirm: "Publish shifts",
	permPositionManage: "Create and change positions",
	permEventManage: "Create and set up events",
	permStaffManage: "Create and change staff",
	permMemberView: "View members",
	permInviteManage: "Create and revoke invite codes",
	permInviteGuest:
		"Invite guests (can create invite codes for roles that include the Discord server requirement exemption)",
	permMemberManage: "Change and remove members' roles",
	permRoleManage: "Create and change roles",
	permTenantManage: "Create and set up locations",
	permOrgSettings: "Change organization settings",
	permGuildBypass: "Exempt from the Discord server requirement (for guests)",

	timeUnitInvalid: "Time step must be 5, 10, 15, or 30 minutes",
	tenantNameRequired: "Enter a location name",
	tenantNameTooLong: "Location name must be 80 characters or fewer",
	eventNameRequired: "Enter an event name",
	eventNameTooLong: "Event name must be 80 characters or fewer",
	positionNameRequired: "Enter a position name",
	positionNameTooLong: "Position name must be 40 characters or fewer",
	colorInvalid: "Color must be in #RRGGBB format",
	requiredCountInteger: "Staff needed must be a whole number",
	requiredCountMin: "Staff needed must be 0 or more",
	requiredCountMax: "Staff needed must be 99 or fewer",

	errorSlugTaken: "This URL is already in use",
	errorTenantNotFound: "Location not found",
	errorEventNotFound: "Event not found",
	errorPositionNotFound: "Position not found",
	errorMemberNotFound: "Member not found",
	errorStaffNotFound: "Staff not found",
	errorRoleNotFound: "Role not found",
	errorStaffMemberTaken: "This member is already linked to other staff",
	errorScopedRoleForbidden:
		"You can't add or remove roles that include permissions you don't have",
	errorLinkForbidden: "You need permission to view members to link one",
	errorOrgPositionsInherit: "For the organization, choose on or off",
	positionIsBreak: "Count as a break",
	colorSwatches: "Color presets",
	colorSwatchesOpen: "Choose from presets",
	colorCustom: "Other color",
	colorTeal: "Teal",
	colorBlue: "Blue",
	colorLavender: "Lavender",
	colorRose: "Rose",
	colorCoral: "Coral",
	colorApricot: "Apricot",
	colorSand: "Sand",
	colorSage: "Sage",
	staffingRuleBadDate: "Enter the date as YYYY-MM-DD",
	staffingRuleBadTime: "Enter times as HH:mm",
	staffingRuleTimeOrder: "Each time range must end after it starts",
	staffingRuleOverlap: "Time ranges for the same day (or every day) overlap",
	staffingRulesMax: "Up to 50 time ranges",
	staffingRulesSummary: "Staff by time ({count})",
	staffingRulesHelp:
		"Change the required number of staff only during these time ranges (the base number applies otherwise). Leave the date empty for every day, or set it for that day only. If both apply at the same time, the dated one wins.",
	staffingRuleDate: "Date",
	staffingRuleEveryDay: "Every day",
	staffingRuleStart: "Start",
	staffingRuleEnd: "End",
	staffingRuleCount: "Staff",
	staffingRuleAdd: "Add a time range",
	staffingRuleRemove: "Remove this time range",
	staffingRuleSaveHint: "Click Save to apply",
} satisfies Messages<typeof ja>;
