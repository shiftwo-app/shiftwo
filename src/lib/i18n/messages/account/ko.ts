import type { Messages } from "../define";
import type ja from "./ja";

export default {
	title: "계정",
	discordLinked: "Discord와 연동했어요",
	discordUnlinkFailed: "연동을 해제하지 못했어요. 잠시 후 다시 시도해 주세요.",
	discordUnlinked: "Discord 연동을 해제했어요",
	avatarTitle: "아이콘",
	avatarDescription:
		"목록과 근무표에 표시돼요. 단체마다 다른 아이콘을 쓸 수도 있어요(단체의 '설정·멤버'에서).",
	avatarResetToDiscord: "Discord 아이콘으로 되돌리기",
	avatarRemove: "아이콘 삭제",
	avatarUnreadable: "이 이미지를 읽지 못했어요",
	avatarTooLarge: "이미지가 너무 커요",
	avatarWrongType: "PNG·JPEG·WebP 이미지를 선택해 주세요",
	avatarChanged: "아이콘을 바꿨어요",
	avatarChoose: "이미지 선택",
	avatarRemoved: "업로드한 아이콘을 삭제했어요",
	emailTitle: "메일 주소",
	emailNote: " (확인 코드로 언제든 로그인할 수 있어요)",
	discordDescription:
		"연동하면 Discord의 사용자 이름·아이콘·메일 주소, 참여 중인 서버 목록, 서버 프로필(멤버인지 여부와 아이콘)을 읽어요({more}).",
	discordNotConfigured: "이 Shiftwo에서는 Discord 연동을 사용할 수 없어요.",
	discordLinkedBadge: "연동됨",
	discordCanSignIn: "Discord로도 로그인할 수 있어요",
	discordUnlink: "연동 해제",
	discordLinkIntro:
		"Discord를 연동하면 Discord로도 로그인할 수 있고, Discord 아이콘이 사용돼요. Discord 서버 멤버만 참여할 수 있는 단체에도 참여할 수 있게 돼요.",
	discordLink: "Discord 연동하기",
	nameRequired: "이름을 입력해 주세요",
	nameTooLong: "이름은 {max}자까지 입력해 주세요",
	languageTitle: "언어",
	languageDescription:
		"화면과 나에게 오는 메일(로그인 메일 등)에 쓰이는 언어예요.",
	languageAuto: "브라우저에 맞추기",
	passkeyTitle: "패스키",
	passkeyDescription:
		"지문, 얼굴, 기기 잠금 해제로 로그인할 수 있어요. 이메일 인증 코드를 기다리지 않아도 돼요.",
	passkeyNone: "등록한 패스키가 없어요",
	passkeyAdd: "패스키 등록하기",
	passkeyAdded: "패스키를 등록했어요. 다음부터 패스키로 로그인할 수 있어요",
	passkeyAddFailed: "패스키를 등록하지 못했어요. 다시 시도해 주세요",
	passkeyRemove: "삭제",
	passkeyRemoved:
		"패스키를 삭제했어요. 기기나 비밀번호 관리자에 남아 있는 것은 그쪽에서 삭제해 주세요",
	passkeyUnnamed: "패스키",
	passkeyCreatedAt: "{date}에 등록",
	passkeySynced: "동기화됨",
	passkeyUnsupported: "이 브라우저에서는 패스키를 사용할 수 없어요",
} satisfies Messages<typeof ja>;
