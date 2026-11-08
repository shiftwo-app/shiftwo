import type { Messages } from "../define";
import type ja from "./ja";

export default {
	consentTitle: "要将 {app} 连接到 Shiftwo 吗？",
	consentLead:
		"连接后，此应用（如 AI 助手）将能以你的身份使用 Shiftwo。它能查看和执行的内容，仅限于你在 Shiftwo 中的权限范围。",
	consentApp: "应用",
	consentReturnsTo: "返回地址",
	consentReturnsToHint: "如果不认识此地址，请不要连接",
	consentRead: "查看你所属的组织、班次和你自己的意愿",
	consentWrite: "创建、修改、删除班次，提交你自己的意愿（在你的权限范围内）",
	consentWriteOptional: "同时允许修改（取消勾选则仅可查看）",
	consentAllow: "连接",
	consentDeny: "取消",
	consentInvalid:
		"此授权页面已无法使用。可能已过期，或找不到要连接的应用。请从应用重新开始连接。",
	consentFailed: "连接失败，请重试。",
	pageTitle: "连接应用",
	appsTitle: "已连接的应用（AI 助手）",
	appsDescription: "可以通过 MCP 从 AI 助手使用 Shiftwo。连接地址为 {url}。",
	appsNone: "没有已连接的应用",
	appsCanWrite: "可以修改",
	appsReadOnly: "仅查看",
	appsConnectedAt: "{date} 连接",
	appsDisconnect: "断开连接",
	appsDisconnected: "已断开与 {app} 的连接",
} satisfies Messages<typeof ja>;
