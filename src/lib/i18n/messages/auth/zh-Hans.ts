import type { Messages } from "../define";
import type ja from "./ja";

export default {
	loginTitle: "登录 Shiftwo",
	loginSendLabel: "发送登录邮件",
	loginDiscordLabel: "使用 Discord 登录",
	signupTitle: "注册 Shiftwo",
	signupSendLabel: "发送注册邮件",
	signupDiscordLabel: "使用 Discord 注册",
	emailInvalid: "请检查邮箱地址的格式",
	emailSendFailed: "无法发送邮件。请检查邮箱地址后再试一次。",
	codeInvalid: "验证码不正确或已过期",
	or: "或",
	emailLabel: "邮箱地址",
	codeSent: "已向 {email} 发送邮件。请打开邮件中的链接，或输入验证码。",
	codeLabel: "验证码（6 位）",
	signIn: "登录",
	changeEmail: "更换邮箱地址",
	resend: "重新发送",
	discordEmailNotVerified:
		"你的 Discord 邮箱地址尚未验证。请先在 Discord 中验证邮箱地址，然后再试一次。",
	discordLoginFailed:
		"登录失败。请确认你的 Discord 邮箱地址已验证，然后再试一次。",
	signupPrompt: "第一次使用？",
	signupLink: "注册",
	loginPrompt: "已有账号？",
	signupStepAccount: "使用 Discord 或邮箱地址（验证码）创建账号",
	signupStepName: "设置你的名字",
	signupStepOrg: "创建组织，或使用邀请码加入组织",
	verifyLinkUnusable: "此链接无法使用（已过期或已使用）。请重新发送登录邮件。",
	verifyLinkInvalid: "链接不正确。",
	verifyNotRequestedHere: "此浏览器没有向 {email} 发送过登录邮件。",
	verifyNotYoursHint:
		"如果这不是你自己发送的邮件，请关闭此页面（这可能是让你登录他人账号的手段）。",
	verifyYoursHint:
		"如果是你自己发送的，请在发送邮件的浏览器中输入验证码，或在此浏览器中从登录页面重新开始。",
	verifyAs: "将以 {email} 的身份登录。",
	verifySubmit: "登录",
	backToLogin: "前往登录页面",
	welcomePageTitle: "欢迎",
	welcomeTitle: "欢迎使用 Shiftwo",
	welcomeBody:
		"已使用 {email} 创建账号。请先设置你的名字。在组织中使用的显示名称，之后可以按组织分别修改。",
	nameLabel: "名字",
	welcomeSubmit: "开始使用",
	welcomeNext: "设置名字后，就可以创建组织，或使用邀请码加入组织。",
	welcomeSwitchAccount: "使用其他账号登录（退出登录）",
	loginEmailSubject: "登录 {app}（验证码 {otp}）",
	loginEmailIntro: "要登录 {app}，请使用以下任一方式。",
	loginEmailOpenLink: "■ 打开链接",
	loginEmailEnterCode: "■ 输入验证码",
	loginEmailExpires: "两者都会在 {minutes} 分钟后失效。",
	loginEmailIgnore: "如果不是你本人操作，请忽略此邮件。",
	passkeySignIn: "使用通行密钥登录",
	passkeyFailed:
		"无法使用通行密钥登录。请确认这是你注册过的通行密钥，或使用电子邮件登录。",
} satisfies Messages<typeof ja>;
