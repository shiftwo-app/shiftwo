import type { Messages } from "../define";
import type ja from "./ja";

export default {
	saveFailed: "We couldn't save. Please try again in a moment.",
	failedShort: "Something went wrong",
	forbiddenGrant:
		"You can't assign or hand out a role that includes permissions you don't have",
	roleConcurrentChange:
		"Someone else changed this role at the same time. Reload the page and try again.",
	roleNotFound: "Role not found",
	roleUpdateForbidden:
		"You can't change a role that includes permissions you don't have",
	roleDeleteForbidden:
		"You can't delete a role that includes permissions you don't have",
	memberNotFound: "Member not found",
	ownerRolesFixed:
		"The owner's roles can't be changed (the owner always has every permission)",
	orgNotFound: "Organization not found",
	ownerCannotBeRemoved: "The owner can't be removed",
	memberRemoveForbidden:
		"You can't remove a member who has permissions you don't have",
	roleNameRequired: "Please enter a role name",
	roleNameTooLong: "Role names can be up to 40 characters",
	roleColorInvalid: "Please enter the color as #RRGGBB",
	discordLinkFirst: "Please link Discord in your account settings first",
	discordGuildNotFound:
		"That server wasn't found (you can only choose servers you've joined)",
} satisfies Messages<typeof ja>;
