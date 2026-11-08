import { defineNamespace } from "../define";
import en from "./en";
import ja from "./ja";
import ko from "./ko";
import zhHans from "./zh-Hans";
import zhHant from "./zh-Hant";

export default defineNamespace({
	ja,
	en,
	"zh-Hans": zhHans,
	"zh-Hant": zhHant,
	ko,
});
