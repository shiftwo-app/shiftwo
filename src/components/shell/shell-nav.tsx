import {
	createContext,
	type ReactNode,
	useContext,
	useEffect,
	useMemo,
	useState,
} from "react";
import type { ScopeTab } from "./ScopeTabs";

// 団体の画面のナビゲーション（いまの単位の画面と、団体全体の画面）を、画面の外側（見出しのメニュー）でも使えるように共有する。
// 団体の画面の土台（routes/_authed/o/$orgSlug.tsx）が登録し、スマートフォンのドロワー（MobileMenu）が読む

export type NavSection = { label: string; items: ScopeTab[] };

type ShellNav = {
	sections: NavSection[];
	setSections: (sections: NavSection[]) => void;
};

const ShellNavContext = createContext<ShellNav | null>(null);

export const ShellNavProvider = ({ children }: { children: ReactNode }) => {
	const [sections, setSections] = useState<NavSection[]>([]);
	const value = useMemo(() => ({ sections, setSections }), [sections]);
	return (
		<ShellNavContext.Provider value={value}>
			{children}
		</ShellNavContext.Provider>
	);
};

export const useShellNavSections = (): NavSection[] =>
	useContext(ShellNavContext)?.sections ?? [];

/** 団体の画面の土台から、いまのナビゲーションを登録する（離れたら消す） */
export const useRegisterShellNav = (sections: NavSection[]) => {
	const setSections = useContext(ShellNavContext)?.setSections;
	// 中身が変わったときだけ登録し直す（毎回の描画で作り直される配列で、登録をくり返さない）
	const key = JSON.stringify(
		sections.map((section) => [
			section.label,
			section.items.map((item) => [item.label, item.link.to, item.link.params]),
		]),
	);
	// biome-ignore lint/correctness/useExhaustiveDependencies: 中身は key で見分ける
	useEffect(() => {
		setSections?.(sections);
		return () => setSections?.([]);
	}, [key, setSections]);
};
