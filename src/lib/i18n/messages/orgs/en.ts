import type { Messages } from "../define";
import type ja from "./ja";

export default {
	listTitle: "Organizations",
	create: "Create organization",
	joinWithCode: "Join with invite code",
	emptyTitle: "You're not in any organization yet",
	emptyBody: "Create an organization, or join one with an invite code.",
	suspendedBadge: "Unavailable due to Discord server requirement",
	createFailed: "We couldn't create it. Please try again in a moment.",
	newBasicsTitle: "Organization",
	newBasicsDescription:
		"Choose the organization's name and the URL of its page.",
	nameLabel: "Organization name",
	nameHint: "e.g. Tech Conference 2026 Organizers",
	slugLabel: "URL",
	slugHint: "The name after /o/. Lowercase letters, numbers, and hyphens",
	newYouTitle: "You",
	newYouDescription: "This is the name shown inside the organization.",
	displayNameLabel: "Your display name in this organization",
	createSubmit: "Create",
	nameRequired: "Please enter an organization name",
	nameTooLong: "Organization names can be up to 80 characters",
	slugTooShort: "The URL must be at least 3 characters",
	slugTooLong: "The URL can be up to 32 characters",
	slugInvalid:
		"Use only lowercase letters, numbers, and hyphens in the URL, and don't start or end it with a hyphen",
	slugReserved: "This URL can't be used",
	slugTaken: "This URL is already taken",
	inviteRevoked: "This invite code has been revoked",
	inviteExpired: "This invite code has expired",
	inviteUsedUp: "This invite code has reached its usage limit",
	joinNotFound: "Invite code not found. Please check what you entered.",
	joinAlreadyMember: "You're already a member of this organization",
	joinDiscordRequired:
		"You need to link Discord to join this organization. Link Discord in your account settings, then try again.",
	joinNotInGuild:
		"You're not a member of this organization's Discord server. Join the server, then try again.",
	joinDiscordUnavailable:
		"We couldn't check with Discord. Please try again in a moment.",
	inviteCodeLabel: "Invite code (8 characters)",
	joinCheck: "Check",
	joinConfirm:
		'You\'ll join "{org}" with the role "{role}" (invite code {code}).',
	joinGuildRequired:
		'Only members of the Discord server "{guild}" can join this organization. You need to link Discord and be a member of that server ({more}).',
	learnMore: "Learn more",
	joinSubmit: "Join",
	joinReenterCode: "Enter a different code",
	suspendedPageTitle: "Unavailable",
	suspendedBadgeNow: "Currently unavailable",
	suspendedBody:
		"Only members of the Discord server \"{guild}\" can view this organization. You can't view it right now because you left the server or your Discord link was removed. Your member information is kept, so you'll be able to view it again once you rejoin the server.",
	suspendedGuildFallback: "the specified server",
	suspendedRecheck: "Check again",
	suspendedRecheckFailed:
		"We still couldn't confirm that you're a member of the server. Check that you've joined the server and that Discord is still linked.",
	suspendedAccountLink: "Account settings (Discord link)",
	listSeparator: " · ",
	discordHelpPageTitle: "Limit joining with a Discord server",
	discordHelpHomeLinkLabel: "Shiftwo (home)",
	discordHelpLabel: "Help",
	discordHelpTitle: "Limit who can join an organization with a Discord server",
	discordHelpIntro:
		"If you set one Discord server in the organization's settings, **only members of that server** can join the organization and see its shifts. If you set your team's Discord server, people outside the team can't join even if an invite code leaks.",
	discordHelpOwnerTitle: "For organization owners and admins",
	discordHelpOwnerStep1:
		"Link Discord in your [account settings] (if you logged in with Discord, it's already linked)",
	discordHelpOwnerStep2:
		'In the organization\'s "Settings & members" → "Discord server", choose the server to require. You can only choose **servers you\'ve joined yourself**',
	discordHelpOwnerStep3:
		"Create invite codes as usual and give them to members",
	discordHelpOwnerNote:
		'This setting can be changed by people with the "Change organization settings" permission (such as owners and managers).',
	discordHelpJoinerTitle: "For people joining",
	discordHelpJoinerStep1:
		"Log in with Discord, or log in with email and then link Discord in your account settings",
	discordHelpJoinerStep2: "Join the organization's Discord server",
	discordHelpJoinerStep3:
		"Enter the invite code to join. At this point, we check whether you're a member of the server",
	discordHelpLeaveTitle: "If someone leaves the server",
	discordHelpLeaveBody1:
		'We check server membership **when someone joins and every time they log in**. People who leave the server or unlink Discord can no longer view the organization. Their member information (display name and roles) is kept, so after rejoining the server they can view it again at their next login or with "Check again".',
	discordHelpLeaveBody2:
		"If Discord is temporarily not responding, we keep things as they were (a Discord outage won't lock everyone out).",
	discordHelpGuestTitle: "Guests (helpers who aren't in the server)",
	discordHelpGuestBody1:
		'If you want people who aren\'t in the server, such as outside helpers, to join, give them an invite code for the **Guest** role. The Guest role has the "Exempt from the Discord server requirement" permission, so they can join without being server members, and they can do the same things as staff.',
	discordHelpGuestBody2:
		'Guest invite codes can be created by people with the "Invite guests" permission (such as owners, managers, and leaders). You can change which roles are exempt in the organization\'s "Roles". Owners are always exempt.',
	discordHelpAvatarTitle: "Icons",
	discordHelpAvatarBody:
		"For people who have linked Discord, their Discord icon appears in lists and elsewhere. If the organization has set a Discord server, we use **the icon they set in that server** (their server profile). For people who haven't linked Discord, the initials of their name are shown.",
	discordHelpDataTitle: "What we read from Discord",
	discordHelpDataItem1: "Username, icon, and email address (for logging in)",
	discordHelpDataItem2:
		"The list of servers you've joined (to choose the server to require)",
	discordHelpDataItem3:
		"Your server profile (whether you're a member of that server, and your server icon)",
	discordHelpDataNote:
		"We don't read messages or channel contents. We never post anything to Discord.",
} satisfies Messages<typeof ja>;
