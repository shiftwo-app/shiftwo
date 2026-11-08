import type { Messages } from "../define";
import type ja from "./ja";

export default {
	title: "账号",
	discordLinked: "已关联 Discord",
	discordUnlinkFailed: "无法解除关联。请稍后再试一次。",
	discordUnlinked: "已解除 Discord 关联",
	avatarTitle: "头像",
	avatarDescription:
		"会显示在列表和班次表中。也可以为每个组织设置不同的头像（在组织的“设置与成员”中）。",
	avatarResetToDiscord: "恢复为 Discord 头像",
	avatarRemove: "移除头像",
	avatarUnreadable: "无法读取此图片",
	avatarTooLarge: "图片太大",
	avatarWrongType: "请选择 PNG、JPEG 或 WebP 格式的图片",
	avatarChanged: "已更换头像",
	avatarChoose: "选择图片",
	avatarRemoved: "已移除上传的头像",
	emailTitle: "邮箱地址",
	emailNote: "（随时可以用验证码登录）",
	discordDescription:
		"关联后，我们会读取你的 Discord 用户名、头像、邮箱地址、已加入的服务器列表，以及你在服务器中的个人资料（是否为成员及服务器头像）（{more}）。",
	discordNotConfigured: "此 Shiftwo 无法使用 Discord 关联。",
	discordLinkedBadge: "已关联",
	discordCanSignIn: "也可以使用 Discord 登录",
	discordUnlink: "解除关联",
	discordLinkIntro:
		"关联 Discord 后，可以使用 Discord 登录，并使用 Discord 头像。还可以加入仅限 Discord 服务器成员参加的组织。",
	discordLink: "关联 Discord",
	nameRequired: "请输入名字",
	nameTooLong: "名字最多 {max} 个字符",
	languageTitle: "语言",
	languageDescription: "用于界面以及发送给你的邮件（如登录邮件）。",
	languageAuto: "跟随浏览器",
} satisfies Messages<typeof ja>;
