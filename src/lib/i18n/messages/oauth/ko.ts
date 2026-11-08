import type { Messages } from "../define";
import type ja from "./ja";

export default {
	consentTitle: "{app}을(를) Shiftwo에 연결할까요?",
	consentLead:
		"연결하면 이 앱(AI 어시스턴트 등)이 내 계정으로 Shiftwo를 사용할 수 있어요. 볼 수 있는 것과 할 수 있는 것은 내가 Shiftwo에서 할 수 있는 범위뿐이에요.",
	consentApp: "앱",
	consentReturnsTo: "돌아갈 곳",
	consentReturnsToHint: "모르는 주소라면 연결하지 마세요",
	consentRead: "소속 단체·근무·내 희망 사항 보기",
	consentWrite: "근무 만들기·바꾸기·삭제, 내 희망 사항 제출(내 권한 범위에서)",
	consentWriteOptional: "변경도 허용(해제하면 보기만 가능)",
	consentAllow: "연결하기",
	consentDeny: "그만두기",
	consentInvalid:
		"이 동의 화면은 사용할 수 없어요. 기한이 지났거나 연결하려는 앱을 찾을 수 없어요. 앱에서 다시 연결해 주세요.",
	consentFailed: "연결하지 못했어요. 다시 시도해 주세요.",
	pageTitle: "앱 연결",
	appsTitle: "연결한 앱(AI 어시스턴트)",
	appsDescription:
		"MCP로 AI 어시스턴트에서 Shiftwo를 사용할 수 있어요. 연결 주소는 {url}이에요.",
	appsNone: "연결한 앱이 없어요",
	appsCanWrite: "변경 가능",
	appsReadOnly: "보기만",
	appsConnectedAt: "{date}에 연결",
	appsDisconnect: "연결 끊기",
	appsDisconnected: "{app}과(와)의 연결을 끊었어요",
} satisfies Messages<typeof ja>;
