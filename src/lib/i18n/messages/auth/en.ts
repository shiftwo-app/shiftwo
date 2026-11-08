import type { Messages } from "../define";
import type ja from "./ja";

export default {
	loginTitle: "Log in to Shiftwo",
	loginSendLabel: "Email me a login link",
	loginDiscordLabel: "Log in with Discord",
	signupTitle: "Sign up for Shiftwo",
	signupSendLabel: "Email me a sign-up link",
	signupDiscordLabel: "Sign up with Discord",
	emailInvalid: "Please check the email address format",
	emailSendFailed:
		"We couldn't send the email. Please check the address and try again.",
	codeInvalid: "The code is incorrect or has expired",
	or: "or",
	emailLabel: "Email address",
	codeSent:
		"We sent an email to {email}. Open the link in the email, or enter the code.",
	codeLabel: "Code (6 digits)",
	signIn: "Log in",
	changeEmail: "Use a different address",
	resend: "Resend",
	discordEmailNotVerified:
		"Your Discord email address isn't verified. Verify it in Discord, then try again.",
	discordLoginFailed:
		"We couldn't log you in. Check that your Discord email address is verified, then try again.",
	signupPrompt: "New here?",
	signupLink: "Sign up",
	loginPrompt: "Already have an account?",
	signupStepAccount:
		"Create an account with Discord or your email address (with a code)",
	signupStepName: "Choose your name",
	signupStepOrg: "Create an organization, or join one with an invite code",
	verifyLinkUnusable:
		"This link can't be used (it has expired or was already used). Please request a new login email.",
	verifyLinkInvalid: "This link isn't valid.",
	verifyNotRequestedHere:
		"No login email was sent to {email} from this browser.",
	verifyNotYoursHint:
		"If you didn't request this email yourself, close this page (it may be an attempt to log you into someone else's account).",
	verifyYoursHint:
		"If you did request it, enter the code in the browser you requested it from, or start over from the login page in this browser.",
	verifyAs: "You're about to log in as {email}.",
	verifySubmit: "Log in",
	backToLogin: "Go to login",
	welcomePageTitle: "Welcome",
	welcomeTitle: "Welcome to Shiftwo",
	welcomeBody:
		"Your account was created with {email}. First, choose your name. You can change your display name for each organization later.",
	nameLabel: "Name",
	welcomeSubmit: "Get started",
	welcomeNext:
		"After choosing your name, create an organization or join one with an invite code.",
	welcomeSwitchAccount: "Log in with a different account (log out)",
	loginEmailSubject: "Log in to {app} (code {otp})",
	loginEmailIntro: "To log in to {app}, use one of the following.",
	loginEmailOpenLink: "■ Open the link",
	loginEmailEnterCode: "■ Enter the code",
	loginEmailExpires: "Both expire in {minutes} minutes.",
	loginEmailIgnore: "If you didn't request this, you can ignore this email.",
	passkeySignIn: "Sign in with a passkey",
	passkeyFailed:
		"Could not sign in with a passkey. Check that it is a passkey you registered, or sign in with email.",
} satisfies Messages<typeof ja>;
