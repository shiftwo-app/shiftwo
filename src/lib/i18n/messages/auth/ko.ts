import type { Messages } from "../define";
import type ja from "./ja";

export default {
	loginTitle: "Shiftwo에 로그인",
	loginSendLabel: "로그인 메일 보내기",
	loginDiscordLabel: "Discord로 로그인",
	signupTitle: "Shiftwo에 가입",
	signupSendLabel: "가입 메일 보내기",
	signupDiscordLabel: "Discord로 가입",
	emailInvalid: "메일 주소 형식을 확인해 주세요",
	emailSendFailed:
		"메일을 보내지 못했어요. 주소를 확인하고 다시 시도해 주세요.",
	codeInvalid: "확인 코드가 틀렸거나 만료되었어요",
	or: "또는",
	emailLabel: "메일 주소",
	codeSent:
		"{email}(으)로 메일을 보냈어요. 메일의 링크를 열거나 확인 코드를 입력해 주세요.",
	codeLabel: "확인 코드 (6자리)",
	signIn: "로그인",
	changeEmail: "주소 바꾸기",
	resend: "다시 보내기",
	discordEmailNotVerified:
		"Discord 메일 주소가 인증되지 않았어요. Discord에서 메일 주소를 인증한 뒤 다시 시도해 주세요.",
	discordLoginFailed:
		"로그인하지 못했어요. Discord 메일 주소가 인증되었는지 확인하고 다시 시도해 주세요.",
	signupPrompt: "처음이신가요?",
	signupLink: "가입하기",
	loginPrompt: "이미 계정이 있나요?",
	signupStepAccount: "Discord 또는 메일 주소(확인 코드)로 계정을 만들어요",
	signupStepName: "이름을 정해요",
	signupStepOrg: "단체를 만들거나 초대 코드로 단체에 참여해요",
	verifyLinkUnusable:
		"이 링크는 사용할 수 없어요(만료되었거나 이미 사용됨). 로그인 메일을 다시 보내 주세요.",
	verifyLinkInvalid: "링크가 올바르지 않아요.",
	verifyNotRequestedHere:
		"이 브라우저에서는 {email}(으)로 로그인 메일을 보내지 않았어요.",
	verifyNotYoursHint:
		"직접 요청한 메일이 아니라면 이 페이지를 닫아 주세요(다른 사람의 계정으로 로그인시키려는 수법일 수 있어요).",
	verifyYoursHint:
		"직접 요청했다면 메일을 요청한 브라우저에서 확인 코드를 입력하거나, 이 브라우저의 로그인 화면에서 다시 시작해 주세요.",
	verifyAs: "{email}(으)로 로그인해요.",
	verifySubmit: "로그인하기",
	backToLogin: "로그인 화면으로",
	welcomePageTitle: "시작하기",
	welcomeTitle: "Shiftwo에 오신 것을 환영해요",
	welcomeBody:
		"{email}(으)로 계정을 만들었어요. 먼저 이름을 정해 주세요. 단체에서 쓰는 표시 이름은 나중에 단체마다 바꿀 수 있어요.",
	nameLabel: "이름",
	welcomeSubmit: "시작하기",
	welcomeNext: "이름을 정하면 단체를 만들거나 초대 코드로 단체에 참여해요.",
	welcomeSwitchAccount: "다른 계정으로 로그인 (로그아웃)",
	loginEmailSubject: "{app} 로그인 (확인 코드 {otp})",
	loginEmailIntro: "{app}에 로그인하려면 다음 중 하나를 사용해 주세요.",
	loginEmailOpenLink: "■ 링크 열기",
	loginEmailEnterCode: "■ 확인 코드 입력하기",
	loginEmailExpires: "둘 다 {minutes}분 뒤에 사용할 수 없게 돼요.",
	loginEmailIgnore: "요청한 적이 없다면 이 메일은 무시해 주세요.",
} satisfies Messages<typeof ja>;
