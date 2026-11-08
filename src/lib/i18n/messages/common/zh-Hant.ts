import type { Messages } from "../define";
import type ja from "./ja";

export default {
	language: "語言",
	appName: "Shiftwo",
	save: "儲存",
	cancel: "取消",
	delete: "刪除",
	close: "關閉",
	edit: "編輯",
	loading: "載入中…",
	failed: "操作失敗，請稍後再試。",
} satisfies Messages<typeof ja>;
