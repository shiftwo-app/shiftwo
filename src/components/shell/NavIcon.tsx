// ナビゲーションのアイコン（デスクトップのサイドバーを縮めたときに、これだけが見える）。線で描き、文字色を使う
export type NavIconName =
	| "home"
	| "tenant"
	| "published"
	| "draft"
	| "report"
	| "timetable"
	| "events"
	| "settings"
	| "preferences"
	| "members";

const PATHS: Record<NavIconName, string[]> = {
	// 家
	home: ["M3 11l9-7 9 7", "M5 10v10h14V10", "M10 20v-6h4v6"],
	// 店
	tenant: [
		"M4 9l1.5-5h13L20 9",
		"M4 9h16v2a3 3 0 0 1-5.3 2 3 3 0 0 1-5.4 0A3 3 0 0 1 4 11z",
		"M6 14v6h12v-6",
	],
	// 確定したシフト（チェックの付いた暦）
	published: ["M4 6h16v14H4z", "M4 10h16", "M8 3v4M16 3v4", "M9 15l2 2 4-4"],
	// 下書き（鉛筆）
	draft: ["M4 20h4L19 9l-4-4L4 16z", "M13 7l4 4"],
	// レポート（棒グラフ）
	report: ["M4 20h16", "M7 16v-5M12 16V7M17 16v-8"],
	// タイムテーブル（時計）
	timetable: ["M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18z", "M12 7v5l3 2"],
	// イベント（旗）
	events: ["M5 21V4", "M5 4h11l-2 4 2 4H5"],
	// 設定（歯車を簡単にしたもの）
	settings: [
		"M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z",
		"M12 2v3M12 19v3M4.2 4.2l2.1 2.1M17.7 17.7l2.1 2.1M2 12h3M19 12h3M4.2 19.8l2.1-2.1M17.7 6.3l2.1-2.1",
	],
	// 希望（手を挙げる人）
	preferences: [
		"M9 21v-7l-2-3V7a2 2 0 0 1 4 0v3",
		"M11 10V5a2 2 0 0 1 4 0v5",
		"M15 10h1a3 3 0 0 1 3 3v2a6 6 0 0 1-6 6h-2",
	],
	// メンバー（2 人）
	members: [
		"M9 11a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7z",
		"M2.5 20a6.5 6.5 0 0 1 13 0",
		"M16 4.5a3.5 3.5 0 0 1 0 6.5",
		"M18 14a6 6 0 0 1 3.5 6",
	],
};

const NavIcon = ({
	name,
	className = "size-5",
}: {
	name: NavIconName;
	className?: string;
}) => (
	<svg
		aria-hidden="true"
		viewBox="0 0 24 24"
		className={className}
		fill="none"
		stroke="currentColor"
		strokeWidth="1.8"
		strokeLinecap="round"
		strokeLinejoin="round"
	>
		{PATHS[name].map((d) => (
			<path key={d} d={d} />
		))}
	</svg>
);

export default NavIcon;
