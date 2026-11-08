import { Link, type LinkProps } from "@tanstack/react-router";

// 団体・テナント・イベントの画面の上に出すタブ（いちばん深い単位の画面の切り替え）。
// いま開いている画面は、下線と太字で示す

export type ScopeTab = {
	label: string;
	link: LinkProps;
	/** 下の階層の画面でも「開いている」にしない（トップのタブ） */
	exact?: boolean;
};

const ScopeTabs = ({ label, tabs }: { label: string; tabs: ScopeTab[] }) => (
	<nav aria-label={label} className="-mb-px flex gap-1 overflow-x-auto">
		{tabs.map((tab) => (
			<Link
				key={tab.label}
				{...tab.link}
				activeOptions={{ exact: tab.exact ?? false, includeSearch: false }}
				className="border-b-2 border-transparent px-3 pt-2 pb-2.5 text-sm whitespace-nowrap text-ink-muted transition-colors hover:text-ink"
				activeProps={{
					className: "border-primary! font-bold text-ink!",
					"aria-current": "page",
				}}
			>
				{tab.label}
			</Link>
		))}
	</nav>
);

export default ScopeTabs;
