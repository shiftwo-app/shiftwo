import type { Messages } from "../define";
import type ja from "./ja";

export default {
	title: "Account",
	discordLinked: "Discord is now linked",
	discordUnlinkFailed:
		"We couldn't unlink Discord. Please try again in a moment.",
	discordUnlinked: "Discord has been unlinked",
	avatarTitle: "Icon",
	avatarDescription:
		'Shown in lists and on shift tables. You can also use a different icon for each organization (from the organization\'s "Settings & members").',
	avatarResetToDiscord: "Use my Discord icon",
	avatarRemove: "Remove icon",
	avatarUnreadable: "We couldn't read this image",
	avatarTooLarge: "The image is too large",
	avatarWrongType: "Please choose a PNG, JPEG, or WebP image",
	avatarChanged: "Icon updated",
	avatarChoose: "Choose image",
	avatarRemoved: "Uploaded icon removed",
	emailTitle: "Email address",
	emailNote: " (you can always log in with a code)",
	discordDescription:
		"When linked, we read your Discord username, icon, and email address, the list of servers you've joined, and your server profiles (whether you're a member, and your server icon) ({more}).",
	discordNotConfigured: "Discord linking isn't available on this Shiftwo.",
	discordLinkedBadge: "Linked",
	discordCanSignIn: "You can also log in with Discord",
	discordUnlink: "Unlink",
	discordLinkIntro:
		"Link Discord to log in with Discord and use your Discord icon. You'll also be able to join organizations that are limited to members of a Discord server.",
	discordLink: "Link Discord",
	nameRequired: "Please enter a name",
	nameTooLong: "Names can be up to {max} characters",
	languageTitle: "Language",
	languageDescription:
		"Used for the screens and for emails sent to you, such as login emails.",
	languageAuto: "Match my browser",
	passkeyTitle: "Passkeys",
	passkeyDescription:
		"Sign in with your fingerprint, face, or device unlock, without waiting for an email code.",
	passkeyNone: "No passkeys yet",
	passkeyAdd: "Add a passkey",
	passkeyAdded: "Passkey added. You can sign in with it next time",
	passkeyAddFailed: "Could not add the passkey. Please try again",
	passkeyRemove: "Remove",
	passkeyRemoved:
		"Passkey removed. Also delete it from your device or password manager",
	passkeyUnnamed: "Passkey",
	passkeyCreatedAt: "Added {date}",
	passkeySynced: "Synced",
	passkeyUnsupported: "This browser does not support passkeys",
} satisfies Messages<typeof ja>;
