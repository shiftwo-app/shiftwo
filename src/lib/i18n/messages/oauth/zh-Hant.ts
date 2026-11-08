import type { Messages } from "../define";
import type ja from "./ja";

export default {
	consentTitle: "要將 {app} 連接到 Shiftwo 嗎？",
	consentLead:
		"連接後，此應用程式（如 AI 助理）將能以你的身分使用 Shiftwo。它能查看和執行的內容，僅限於你在 Shiftwo 中的權限範圍。",
	consentApp: "應用程式",
	consentReturnsTo: "返回位址",
	consentReturnsToHint: "如果不認得此位址，請不要連接",
	consentRead: "查看你所屬的組織、班次和你自己的意願",
	consentWrite: "建立、修改、刪除班次，提交你自己的意願（在你的權限範圍內）",
	consentWriteOptional: "同時允許修改（取消勾選則僅可查看）",
	consentAllow: "連接",
	consentDeny: "取消",
	consentInvalid:
		"此授權頁面已無法使用。可能已過期，或找不到要連接的應用程式。請從應用程式重新開始連接。",
	consentFailed: "連接失敗，請再試一次。",
	pageTitle: "連接應用程式",
	appsTitle: "已連接的應用程式（AI 助理）",
	appsDescription: "可以透過 MCP 從 AI 助理使用 Shiftwo。連接位址為 {url}。",
	appsNone: "沒有已連接的應用程式",
	appsCanWrite: "可以修改",
	appsReadOnly: "僅查看",
	appsConnectedAt: "{date} 連接",
	appsDisconnect: "中斷連接",
	appsDisconnected: "已中斷與 {app} 的連接",
} satisfies Messages<typeof ja>;
