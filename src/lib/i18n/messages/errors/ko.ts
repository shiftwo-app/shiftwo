import type { Messages } from "../define";
import type ja from "./ja";

export default {
	saveFailed: "저장하지 못했어요. 잠시 후 다시 시도해 주세요.",
	failedShort: "하지 못했어요",
	forbiddenGrant:
		"내가 가지지 않은 권한이 포함된 역할은 부여하거나 넘길 수 없어요",
	roleConcurrentChange:
		"다른 사람이 동시에 이 역할을 바꿨어요. 화면을 새로 고친 뒤 다시 시도해 주세요.",
	roleNotFound: "역할을 찾을 수 없어요",
	roleUpdateForbidden: "내가 가지지 않은 권한이 포함된 역할은 바꿀 수 없어요",
	roleDeleteForbidden: "내가 가지지 않은 권한이 포함된 역할은 삭제할 수 없어요",
	memberNotFound: "멤버를 찾을 수 없어요",
	ownerRolesFixed:
		"소유자의 역할은 바꿀 수 없어요(소유자는 항상 모든 권한을 가져요)",
	orgNotFound: "단체를 찾을 수 없어요",
	ownerCannotBeRemoved: "소유자는 내보낼 수 없어요",
	memberRemoveForbidden: "내가 가지지 않은 권한을 가진 멤버는 내보낼 수 없어요",
	roleNameRequired: "역할 이름을 입력해 주세요",
	roleNameTooLong: "역할 이름은 40자까지 입력해 주세요",
	roleColorInvalid: "색은 #RRGGBB 형식으로 지정해 주세요",
	discordLinkFirst: "먼저 계정 설정에서 Discord를 연동해 주세요",
	discordGuildNotFound:
		"그 서버를 찾을 수 없어요(내가 참여 중인 서버만 선택할 수 있어요)",
} satisfies Messages<typeof ja>;
