import type { Messages } from "../define";
import type ja from "./ja";

export default {
	consentTitle: "Connect {app} to Shiftwo?",
	consentLead:
		"If you connect, this app (such as an AI assistant) can use Shiftwo as you. It can only see and do what you can in Shiftwo.",
	consentApp: "App",
	consentReturnsTo: "Returns to",
	consentReturnsToHint: "If you do not recognize this address, do not connect",
	consentRead: "View your organizations, shifts, and your own preferences",
	consentWrite:
		"Create, change, and delete shifts, and submit your own preferences (within your permissions)",
	consentWriteOptional: "Also allow changes (uncheck to allow viewing only)",
	consentAllow: "Connect",
	consentDeny: "Cancel",
	consentInvalid:
		"This consent page can no longer be used. It has expired or the app was not found. Start connecting again from the app.",
	consentFailed: "Could not connect. Please try again.",
	pageTitle: "Connect an app",
	appsTitle: "Connected apps (AI assistants)",
	appsDescription:
		"You can use Shiftwo from AI assistants over MCP. Connect them to {url}.",
	appsNone: "No connected apps",
	appsCanWrite: "Can make changes",
	appsReadOnly: "View only",
	appsConnectedAt: "Connected {date}",
	appsDisconnect: "Disconnect",
	appsDisconnected: "Disconnected {app}",
} satisfies Messages<typeof ja>;
