import type { Messages } from "../define";
import type ja from "./ja";

export default {
	language: "언어",
	appName: "Shiftwo",
	save: "저장",
	cancel: "취소",
	delete: "삭제",
	close: "닫기",
	edit: "수정",
	loading: "불러오는 중…",
	failed: "실패했습니다. 잠시 후 다시 시도해 주세요.",
} satisfies Messages<typeof ja>;
