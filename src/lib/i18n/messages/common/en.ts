import type { Messages } from "../define";
import type ja from "./ja";

export default {
	language: "Language",
	appName: "Shiftwo",
	save: "Save",
	cancel: "Cancel",
	delete: "Delete",
	close: "Close",
	edit: "Edit",
	loading: "Loading…",
	failed: "Something went wrong. Please try again in a moment.",
} satisfies Messages<typeof ja>;
