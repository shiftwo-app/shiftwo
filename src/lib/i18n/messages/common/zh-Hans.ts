import type { Messages } from "../define";
import type ja from "./ja";

export default {
	language: "语言",
	appName: "Shiftwo",
	save: "保存",
	cancel: "取消",
	delete: "删除",
	close: "关闭",
	edit: "编辑",
	loading: "加载中…",
	failed: "操作失败，请稍后再试。",
} satisfies Messages<typeof ja>;
