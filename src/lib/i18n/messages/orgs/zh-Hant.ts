import type { Messages } from "../define";
import type ja from "./ja";

export default {
	listTitle: "組織",
	create: "建立組織",
	joinWithCode: "使用邀請碼加入",
	emptyTitle: "你還沒有加入任何組織",
	emptyBody: "請建立組織，或使用邀請碼加入。",
	suspendedBadge: "因 Discord 伺服器條件無法檢視",
	createFailed: "無法建立。請稍後再試一次。",
	newBasicsTitle: "組織",
	newBasicsDescription: "設定組織名稱和組織頁面的 URL。",
	nameLabel: "組織名稱",
	nameHint: "例：技術研討會 2026 營運組",
	slugLabel: "URL",
	slugHint: "/o/ 後面的名稱。僅限半形小寫英文字母、數字和連字號",
	newYouTitle: "你",
	newYouDescription: "在組織中會顯示這個名字。",
	displayNameLabel: "你在此組織中的顯示名稱",
	createSubmit: "建立",
	nameRequired: "請輸入組織名稱",
	nameTooLong: "組織名稱最多 80 個字元",
	slugTooShort: "URL 至少需要 3 個字元",
	slugTooLong: "URL 最多 32 個字元",
	slugInvalid:
		"URL 只能使用半形小寫英文字母、數字和連字號，且不能以連字號開頭或結尾",
	slugReserved: "此 URL 無法使用",
	slugTaken: "此 URL 已被使用",
	inviteRevoked: "此邀請碼已被撤銷",
	inviteExpired: "此邀請碼已過期",
	inviteUsedUp: "此邀請碼的可用次數已用完",
	joinNotFound: "找不到邀請碼。請檢查輸入內容。",
	joinAlreadyMember: "你已經是此組織的成員",
	joinDiscordRequired:
		"加入此組織需要連結 Discord。請在帳號設定中連結 Discord 後再試一次。",
	joinNotInGuild: "你不是此組織 Discord 伺服器的成員。請加入伺服器後再試一次。",
	joinDiscordUnavailable: "無法向 Discord 確認。請稍後再試一次。",
	inviteCodeLabel: "邀請碼（8 個字元）",
	joinCheck: "確認",
	joinConfirm: "將以角色「{role}」加入「{org}」（邀請碼 {code}）。",
	joinGuildRequired:
		"只有 Discord 伺服器「{guild}」的成員才能加入此組織。你需要連結 Discord 並加入該伺服器（{more}）。",
	learnMore: "了解詳情",
	joinSubmit: "加入",
	joinReenterCode: "重新輸入邀請碼",
	suspendedPageTitle: "無法檢視",
	suspendedBadgeNow: "目前無法檢視",
	suspendedBody:
		"只有 Discord 伺服器「{guild}」的成員才能檢視此組織。由於你已退出伺服器或 Discord 連結已中斷，目前無法檢視。你的成員資訊仍然保留，重新加入伺服器後即可再次檢視。",
	suspendedGuildFallback: "指定的伺服器",
	suspendedRecheck: "再次確認",
	suspendedRecheckFailed:
		"仍無法確認你是伺服器成員。請確認你已加入伺服器，並且 Discord 連結沒有中斷。",
	suspendedAccountLink: "帳號設定（Discord 連結）",
	listSeparator: "、",
	discordHelpPageTitle: "透過 Discord 伺服器限制加入",
	discordHelpHomeLinkLabel: "Shiftwo（返回首頁）",
	discordHelpLabel: "說明",
	discordHelpTitle: "透過 Discord 伺服器限制組織的加入者",
	discordHelpIntro:
		"在組織設定中指定一個 Discord 伺服器後，**只有該伺服器的成員**才能加入組織並檢視班次。只要指定營運團隊的 Discord 伺服器，即使邀請碼外洩，團隊以外的人也無法加入。",
	discordHelpOwnerTitle: "組織擁有者和管理者需要做的事",
	discordHelpOwnerStep1:
		"在[帳號設定]中連結 Discord（如果你使用 Discord 登入，則已經連結）",
	discordHelpOwnerStep2:
		"在組織的「設定與成員」→「Discord 伺服器」中，選擇作為加入條件的伺服器。只能選擇**你自己已加入的伺服器**",
	discordHelpOwnerStep3: "像往常一樣產生邀請碼，並發給成員",
	discordHelpOwnerNote:
		"擁有「修改組織設定」權限的人（擁有者、經理等）可以修改此設定。",
	discordHelpJoinerTitle: "加入者需要做的事",
	discordHelpJoinerStep1:
		"使用 Discord 登入，或使用電子郵件登入後在帳號設定中連結 Discord",
	discordHelpJoinerStep2: "先加入組織的 Discord 伺服器",
	discordHelpJoinerStep3: "輸入邀請碼加入。此時會確認你是否為伺服器成員",
	discordHelpLeaveTitle: "退出伺服器時",
	discordHelpLeaveBody1:
		"我們會在**加入時以及每次登入時**確認是否為伺服器成員。退出伺服器或解除 Discord 連結的人將無法檢視該組織。成員資訊（顯示名稱和角色）會保留，重新加入伺服器後，下次登入或點選「再次確認」即可再次檢視。",
	discordHelpLeaveBody2:
		"當 Discord 暫時無回應時，會保持之前的狀態（不會因為 Discord 故障而把所有人拒於門外）。",
	discordHelpGuestTitle: "訪客（未加入伺服器的協助者）",
	discordHelpGuestBody1:
		"如果希望外部協助者等未加入伺服器的人也能參加，請給他們**訪客**角色的邀請碼。訪客角色帶有「免除 Discord 伺服器加入條件」權限，即使不是伺服器成員也能加入，可做的事與工作人員相同。",
	discordHelpGuestBody2:
		"擁有「邀請訪客」權限的人（擁有者、經理、組長等）可以產生訪客邀請碼。哪些角色享有免除，可以在組織的「角色」中修改。擁有者始終享有免除。",
	discordHelpAvatarTitle: "頭像",
	discordHelpAvatarBody:
		"已連結 Discord 的人，列表等處會顯示其 Discord 頭像。如果組織指定了 Discord 伺服器，則使用**其在該伺服器中設定的頭像**（伺服器個人資料）。未連結的人會顯示名字的首字。",
	discordHelpDataTitle: "從 Discord 讀取的資訊",
	discordHelpDataItem1: "使用者名稱、頭像、電子郵件地址（用於登入）",
	discordHelpDataItem2: "已加入的伺服器列表（用於選擇作為加入條件的伺服器）",
	discordHelpDataItem3:
		"伺服器中的個人資料（是否為該伺服器成員，以及伺服器中的頭像）",
	discordHelpDataNote:
		"我們不會讀取訊息或頻道內容，也不會向 Discord 寫入任何內容。",
} satisfies Messages<typeof ja>;
