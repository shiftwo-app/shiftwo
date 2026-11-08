import type { Messages } from "../define";
import type ja from "./ja";

export default {
	title: "帳號",
	discordLinked: "已連結 Discord",
	discordUnlinkFailed: "無法解除連結。請稍後再試一次。",
	discordUnlinked: "已解除 Discord 連結",
	avatarTitle: "頭像",
	avatarDescription:
		"會顯示在列表和班次表中。也可以為每個組織設定不同的頭像（在組織的「設定與成員」中）。",
	avatarResetToDiscord: "恢復為 Discord 頭像",
	avatarRemove: "移除頭像",
	avatarUnreadable: "無法讀取此圖片",
	avatarTooLarge: "圖片太大",
	avatarWrongType: "請選擇 PNG、JPEG 或 WebP 格式的圖片",
	avatarChanged: "已更換頭像",
	avatarChoose: "選擇圖片",
	avatarRemoved: "已移除上傳的頭像",
	emailTitle: "電子郵件地址",
	emailNote: "（隨時可以用驗證碼登入）",
	discordDescription:
		"連結後，我們會讀取你的 Discord 使用者名稱、頭像、電子郵件地址、已加入的伺服器列表，以及你在伺服器中的個人資料（是否為成員及伺服器頭像）（{more}）。",
	discordNotConfigured: "此 Shiftwo 無法使用 Discord 連結。",
	discordLinkedBadge: "已連結",
	discordCanSignIn: "也可以使用 Discord 登入",
	discordUnlink: "解除連結",
	discordLinkIntro:
		"連結 Discord 後，可以使用 Discord 登入，並使用 Discord 頭像。還可以加入僅限 Discord 伺服器成員參加的組織。",
	discordLink: "連結 Discord",
	nameRequired: "請輸入名字",
	nameTooLong: "名字最多 {max} 個字元",
} satisfies Messages<typeof ja>;
