import type { Messages } from "../define";
import type ja from "./ja";

export default {
	listTitle: "组织",
	create: "创建组织",
	joinWithCode: "使用邀请码加入",
	emptyTitle: "你还没有加入任何组织",
	emptyBody: "请创建组织，或使用邀请码加入。",
	suspendedBadge: "因 Discord 服务器条件无法查看",
	createFailed: "无法创建。请稍后再试一次。",
	newBasicsTitle: "组织",
	newBasicsDescription: "设置组织名称和组织页面的 URL。",
	nameLabel: "组织名称",
	nameHint: "例：技术大会 2026 运营组",
	slugLabel: "URL",
	slugHint: "/o/ 后面的名称。仅限半角小写英文字母、数字和连字符",
	newYouTitle: "你",
	newYouDescription: "在组织中会显示这个名字。",
	displayNameLabel: "你在此组织中的显示名称",
	createSubmit: "创建",
	nameRequired: "请输入组织名称",
	nameTooLong: "组织名称最多 80 个字符",
	slugTooShort: "URL 至少需要 3 个字符",
	slugTooLong: "URL 最多 32 个字符",
	slugInvalid:
		"URL 只能使用半角小写英文字母、数字和连字符，且不能以连字符开头或结尾",
	slugReserved: "此 URL 无法使用",
	slugTaken: "此 URL 已被使用",
	inviteRevoked: "此邀请码已被撤销",
	inviteExpired: "此邀请码已过期",
	inviteUsedUp: "此邀请码的可用次数已用完",
	joinNotFound: "找不到邀请码。请检查输入内容。",
	joinAlreadyMember: "你已经是此组织的成员",
	joinDiscordRequired:
		"加入此组织需要关联 Discord。请在账号设置中关联 Discord 后再试一次。",
	joinNotInGuild: "你不是此组织 Discord 服务器的成员。请加入服务器后再试一次。",
	joinDiscordUnavailable: "无法向 Discord 确认。请稍后再试一次。",
	inviteCodeLabel: "邀请码（8 个字符）",
	joinCheck: "确认",
	joinConfirm: "将以角色“{role}”加入“{org}”（邀请码 {code}）。",
	joinGuildRequired:
		"只有 Discord 服务器“{guild}”的成员才能加入此组织。你需要关联 Discord 并加入该服务器（{more}）。",
	learnMore: "了解详情",
	joinSubmit: "加入",
	joinReenterCode: "重新输入邀请码",
	suspendedPageTitle: "无法查看",
	suspendedBadgeNow: "目前无法查看",
	suspendedBody:
		"只有 Discord 服务器“{guild}”的成员才能查看此组织。由于你已退出服务器或 Discord 关联已断开，目前无法查看。你的成员信息仍然保留，重新加入服务器后即可再次查看。",
	suspendedGuildFallback: "指定的服务器",
	suspendedRecheck: "再次确认",
	suspendedRecheckFailed:
		"仍无法确认你是服务器成员。请确认你已加入服务器，并且 Discord 关联没有断开。",
	suspendedAccountLink: "账号设置（Discord 关联）",
	listSeparator: "、",
	discordHelpPageTitle: "通过 Discord 服务器限制加入",
	discordHelpHomeLinkLabel: "Shiftwo（返回首页）",
	discordHelpLabel: "帮助",
	discordHelpTitle: "通过 Discord 服务器限制组织的加入者",
	discordHelpIntro:
		"在组织设置中指定一个 Discord 服务器后，**只有该服务器的成员**才能加入组织并查看班次。只要指定运营团队的 Discord 服务器，即使邀请码外泄，团队以外的人也无法加入。",
	discordHelpOwnerTitle: "组织所有者和管理者需要做的事",
	discordHelpOwnerStep1:
		"在[账号设置]中关联 Discord（如果你使用 Discord 登录，则已经关联）",
	discordHelpOwnerStep2:
		"在组织的“设置与成员”→“Discord 服务器”中，选择作为加入条件的服务器。只能选择**你自己已加入的服务器**",
	discordHelpOwnerStep3: "像往常一样生成邀请码，并发给成员",
	discordHelpOwnerNote:
		"拥有“修改组织设置”权限的人（所有者、经理等）可以修改此设置。",
	discordHelpJoinerTitle: "加入者需要做的事",
	discordHelpJoinerStep1:
		"使用 Discord 登录，或使用邮箱登录后在账号设置中关联 Discord",
	discordHelpJoinerStep2: "先加入组织的 Discord 服务器",
	discordHelpJoinerStep3: "输入邀请码加入。此时会确认你是否为服务器成员",
	discordHelpLeaveTitle: "退出服务器时",
	discordHelpLeaveBody1:
		"我们会在**加入时以及每次登录时**确认是否为服务器成员。退出服务器或解除 Discord 关联的人将无法查看该组织。成员信息（显示名称和角色）会保留，重新加入服务器后，下次登录或点击“再次确认”即可再次查看。",
	discordHelpLeaveBody2:
		"当 Discord 暂时无响应时，会保持之前的状态（不会因为 Discord 故障而把所有人拒之门外）。",
	discordHelpGuestTitle: "访客（未加入服务器的协助者）",
	discordHelpGuestBody1:
		"如果希望外部协助者等未加入服务器的人也能参加，请给他们**访客**角色的邀请码。访客角色带有“免除 Discord 服务器加入条件”权限，即使不是服务器成员也能加入，可做的事与工作人员相同。",
	discordHelpGuestBody2:
		"拥有“邀请访客”权限的人（所有者、经理、组长等）可以生成访客邀请码。哪些角色享有免除，可以在组织的“角色”中修改。所有者始终享有免除。",
	discordHelpAvatarTitle: "头像",
	discordHelpAvatarBody:
		"已关联 Discord 的人，列表等处会显示其 Discord 头像。如果组织指定了 Discord 服务器，则使用**其在该服务器中设置的头像**（服务器个人资料）。未关联的人会显示名字的首字母。",
	discordHelpDataTitle: "从 Discord 读取的信息",
	discordHelpDataItem1: "用户名、头像、邮箱地址（用于登录）",
	discordHelpDataItem2: "已加入的服务器列表（用于选择作为加入条件的服务器）",
	discordHelpDataItem3:
		"服务器中的个人资料（是否为该服务器成员，以及服务器中的头像）",
	discordHelpDataNote:
		"我们不会读取消息或频道内容，也不会向 Discord 写入任何内容。",
} satisfies Messages<typeof ja>;
