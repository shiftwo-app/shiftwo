import type { Messages } from "../define";
import type ja from "./ja";

export default {
	listTitle: "단체",
	create: "단체 만들기",
	joinWithCode: "초대 코드로 참여",
	emptyTitle: "아직 소속된 단체가 없어요",
	emptyBody: "단체를 만들거나 초대 코드로 참여해 주세요.",
	suspendedBadge: "Discord 서버 조건 때문에 볼 수 없어요",
	createFailed: "만들지 못했어요. 잠시 후 다시 시도해 주세요.",
	newBasicsTitle: "단체",
	newBasicsDescription: "단체 이름과 단체 페이지의 URL을 정해요.",
	nameLabel: "단체 이름",
	nameHint: "예: 기술 콘퍼런스 2026 운영",
	slugLabel: "URL",
	slugHint: "/o/ 뒤에 붙는 이름. 영어 소문자·숫자·하이픈",
	newYouTitle: "나",
	newYouDescription: "단체 안에서는 이 이름으로 표시돼요.",
	displayNameLabel: "이 단체에서 쓸 표시 이름",
	createSubmit: "만들기",
	nameRequired: "단체 이름을 입력해 주세요",
	nameTooLong: "단체 이름은 80자까지 입력해 주세요",
	slugTooShort: "URL은 3자 이상으로 해 주세요",
	slugTooLong: "URL은 32자까지 입력해 주세요",
	slugInvalid:
		"URL에는 영어 소문자·숫자·하이픈만 쓰고, 하이픈으로 시작하거나 끝나지 않게 해 주세요",
	slugReserved: "이 URL은 사용할 수 없어요",
	slugTaken: "이 URL은 이미 사용 중이에요",
	inviteRevoked: "이 초대 코드는 취소되었어요",
	inviteExpired: "이 초대 코드는 만료되었어요",
	inviteUsedUp: "이 초대 코드는 사용 가능 횟수를 모두 썼어요",
	joinNotFound: "초대 코드를 찾을 수 없어요. 입력한 내용을 확인해 주세요",
	joinAlreadyMember: "이미 이 단체의 멤버예요",
	joinDiscordRequired:
		"이 단체에 참여하려면 Discord 연동이 필요해요. 계정 설정에서 Discord를 연동한 뒤 다시 시도해 주세요",
	joinNotInGuild:
		"이 단체의 Discord 서버 멤버가 아니에요. 서버에 참여한 뒤 다시 시도해 주세요",
	joinDiscordUnavailable:
		"Discord에서 확인하지 못했어요. 잠시 후 다시 시도해 주세요",
	inviteCodeLabel: "초대 코드 (8자)",
	joinCheck: "확인하기",
	joinConfirm: "'{org}'에 역할 '{role}'(으)로 참여해요 (초대 코드 {code}).",
	joinGuildRequired:
		"이 단체는 Discord 서버 '{guild}'의 멤버만 참여할 수 있어요. Discord를 연동하고 그 서버에 참여해 있어야 해요({more}).",
	learnMore: "자세히",
	joinSubmit: "참여하기",
	joinReenterCode: "코드 다시 입력하기",
	suspendedPageTitle: "볼 수 없어요",
	suspendedBadgeNow: "지금은 볼 수 없어요",
	suspendedBody:
		"이 단체는 Discord 서버 '{guild}'의 멤버만 볼 수 있어요. 서버에서 나갔거나 Discord 연동이 끊겨서 지금은 볼 수 없어요. 멤버 정보는 남아 있으니 서버에 다시 들어가면 다시 볼 수 있어요.",
	suspendedGuildFallback: "지정된 서버",
	suspendedRecheck: "다시 확인하기",
	suspendedRecheckFailed:
		"아직 서버 멤버인지 확인하지 못했어요. 서버에 참여해 있는지, Discord 연동이 끊기지 않았는지 확인해 주세요",
	suspendedAccountLink: "계정 설정 (Discord 연동)",
	listSeparator: " · ",
	discordHelpPageTitle: "Discord 서버로 참여 제한하기",
	discordHelpHomeLinkLabel: "Shiftwo (홈으로)",
	discordHelpLabel: "도움말",
	discordHelpTitle: "Discord 서버로 단체 참여를 제한하기",
	discordHelpIntro:
		"단체 설정에서 Discord 서버를 하나 지정하면 **그 서버의 멤버만** 단체에 참여하고 근무를 볼 수 있어요. 운영팀의 Discord 서버를 지정해 두면 초대 코드가 밖으로 새어 나가도 팀 밖의 사람은 참여할 수 없어요.",
	discordHelpOwnerTitle: "단체 소유자·관리자가 할 일",
	discordHelpOwnerStep1:
		"[계정 설정]에서 Discord를 연동해요(Discord로 로그인했다면 이미 연동되어 있어요)",
	discordHelpOwnerStep2:
		"단체의 '설정·멤버' → 'Discord 서버'에서 참여 조건으로 할 서버를 선택해요. **내가 참여 중인 서버**만 선택할 수 있어요",
	discordHelpOwnerStep3: "평소처럼 초대 코드를 발급해서 멤버에게 전달해요",
	discordHelpOwnerNote:
		"이 설정은 '단체 설정 변경' 권한을 가진 사람(소유자·매니저 등)이 바꿀 수 있어요.",
	discordHelpJoinerTitle: "참여하는 사람이 할 일",
	discordHelpJoinerStep1:
		"Discord로 로그인하거나, 메일로 로그인한 뒤 계정 설정에서 Discord를 연동해요",
	discordHelpJoinerStep2: "단체의 Discord 서버에 미리 참여해 둬요",
	discordHelpJoinerStep3:
		"초대 코드를 입력해 참여해요. 이때 서버 멤버인지 확인해요",
	discordHelpLeaveTitle: "서버에서 나갔을 때",
	discordHelpLeaveBody1:
		"서버 멤버인지는 **참여할 때와 로그인할 때마다** 확인해요. 서버에서 나간 사람이나 Discord 연동을 해제한 사람은 그 단체를 볼 수 없게 돼요. 멤버 정보(표시 이름과 역할)는 남아 있으니, 서버에 다시 들어가면 다음 로그인 때나 '다시 확인하기'로 다시 볼 수 있어요.",
	discordHelpLeaveBody2:
		"Discord가 일시적으로 응답하지 않을 때는 이전 상태를 그대로 유지해요(Discord 장애로 모두가 차단되는 일은 없어요).",
	discordHelpGuestTitle: "게스트 (서버에 없는 협력자)",
	discordHelpGuestBody1:
		"외부 협력자처럼 서버에 없는 사람도 참여시키고 싶을 때는 **게스트** 역할의 초대 코드를 전달해요. 게스트 역할에는 'Discord 서버 참여 조건 면제' 권한이 있어서, 서버 멤버가 아니어도 참여할 수 있고 할 수 있는 일은 스태프와 같아요.",
	discordHelpGuestBody2:
		"게스트 초대 코드는 '게스트 초대' 권한을 가진 사람(소유자·매니저·리더 등)이 발급할 수 있어요. 어떤 역할에 면제를 줄지는 단체의 '역할'에서 바꿀 수 있어요. 소유자는 항상 면제돼요.",
	discordHelpAvatarTitle: "아이콘",
	discordHelpAvatarBody:
		"Discord를 연동한 사람은 목록 등에 Discord 아이콘이 표시돼요. 단체가 Discord 서버를 지정했다면 **그 서버에서 설정한 아이콘**(서버 프로필)을 사용해요. 연동하지 않은 사람은 이름의 첫 글자가 표시돼요.",
	discordHelpDataTitle: "Discord에서 읽는 정보",
	discordHelpDataItem1: "사용자 이름·아이콘·메일 주소 (로그인용)",
	discordHelpDataItem2:
		"참여 중인 서버 목록 (참여 조건으로 할 서버를 선택하기 위해)",
	discordHelpDataItem3: "서버 프로필 (그 서버의 멤버인지 여부와 서버 아이콘)",
	discordHelpDataNote:
		"메시지나 채널 내용은 읽지 않아요. Discord에 무언가를 쓰는 일도 없어요.",
} satisfies Messages<typeof ja>;
