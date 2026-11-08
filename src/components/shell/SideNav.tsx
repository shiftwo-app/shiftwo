import { Link } from "@tanstack/react-router";
import { useT } from "../../lib/i18n/react";
import NavIcon from "./NavIcon";
import type { NavSection } from "./shell-nav";

/**
 * デスクトップ（lg 以上）のサイドバー（FR-3-4）。ふだんはアイコンだけの細い帯で、
 * マウスを載せる・キーボードで中に移ると、名前の見える幅に広がる（中身の上に重ねて広げるので、画面はずれない）。
 * 「開いたままにする」で固定すると、いつも名前の見える幅で、中身はその横に並ぶ
 */
const SideNav = ({
	label,
	sections,
	pinned,
	onTogglePinned,
}: {
	label: string;
	sections: NavSection[];
	pinned: boolean;
	onTogglePinned: () => void;
}) => {
	const t = useT();
	// 名前などを見せるか：固定しているときはいつも、縮めているときは広がったときだけ
	const reveal = pinned
		? "opacity-100"
		: "opacity-0 transition-opacity group-hover/side:opacity-100 group-focus-within/side:opacity-100 motion-reduce:transition-none";
	return (
		<nav
			aria-label={label}
			className={`group/side fixed top-14 bottom-0 left-0 z-30 hidden flex-col overflow-x-hidden border-r border-line bg-surface lg:flex ${pinned ? "w-60" : "w-16 transition-[width,box-shadow] duration-150 hover:w-60 hover:shadow-xl focus-within:w-60 focus-within:shadow-xl motion-reduce:transition-none"}`}
		>
			<div className="flex flex-1 flex-col gap-4 overflow-y-auto py-4">
				{sections.map((section) => (
					<div key={section.label} className="space-y-1">
						<p
							className={`truncate px-5 text-[11px] font-bold whitespace-nowrap text-ink-muted ${reveal}`}
						>
							{section.label}
						</p>
						<ul className="space-y-0.5 px-2">
							{section.items.map((item) => (
								<li key={`${section.label}-${item.label}`}>
									<Link
										{...item.link}
										title={item.label}
										activeOptions={{
											exact: item.exact ?? false,
											includeSearch: false,
										}}
										className="flex h-10 items-center gap-3 rounded-md px-3 text-sm whitespace-nowrap text-ink-muted transition-colors hover:bg-surface-sunken hover:text-ink"
										activeProps={{
											className: "bg-primary-soft! font-bold text-ink!",
											"aria-current": "page",
										}}
									>
										<NavIcon name={item.icon} className="size-5 shrink-0" />
										<span className={`truncate ${reveal}`}>{item.label}</span>
									</Link>
								</li>
							))}
						</ul>
					</div>
				))}
			</div>
			{/* 開いたまま固定する・縮める */}
			<div className="border-t border-line p-2">
				<button
					type="button"
					aria-pressed={pinned}
					title={pinned ? t("shell.sidebarUnpin") : t("shell.sidebarPin")}
					onClick={(event) => {
						// マウスで縮めたときは、ボタンから離す（押したままのフォーカスで、広がったままにならないように）。
						// キーボード（detail が 0）のときは、そのまま操作を続けられるよう離さない
						if (pinned && event.detail > 0) event.currentTarget.blur();
						onTogglePinned();
					}}
					className="flex h-10 w-full items-center gap-3 rounded-md px-3 text-sm whitespace-nowrap text-ink-muted hover:bg-surface-sunken hover:text-ink"
				>
					<svg
						aria-hidden="true"
						viewBox="0 0 24 24"
						className={`size-5 shrink-0 transition-transform motion-reduce:transition-none ${pinned ? "rotate-180" : ""}`}
						fill="none"
						stroke="currentColor"
						strokeWidth="1.8"
						strokeLinecap="round"
						strokeLinejoin="round"
					>
						<path d="M4 4v16" />
						<path d="M10 12h10M15 7l5 5-5 5" />
					</svg>
					<span className={`truncate ${reveal}`}>
						{pinned ? t("shell.sidebarUnpin") : t("shell.sidebarPin")}
					</span>
				</button>
			</div>
		</nav>
	);
};

export default SideNav;
