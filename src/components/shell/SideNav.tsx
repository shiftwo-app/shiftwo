import { Link } from "@tanstack/react-router";
import NavIcon from "./NavIcon";
import type { NavSection } from "./shell-nav";

/**
 * デスクトップ（lg 以上）のサイドバー（FR-3-4）。ふだんはアイコンだけの細い帯で、
 * マウスを載せる・キーボードで中に移ると、名前の見える幅に広がる（中身の上に重ねて広げるので、画面はずれない）
 */
const SideNav = ({
	label,
	sections,
}: {
	label: string;
	sections: NavSection[];
}) => (
	<nav
		aria-label={label}
		className="group/side fixed top-14 bottom-0 left-0 z-30 hidden w-16 overflow-x-hidden overflow-y-auto border-r border-line bg-surface transition-[width,box-shadow] duration-150 hover:w-60 hover:shadow-xl focus-within:w-60 focus-within:shadow-xl motion-reduce:transition-none lg:block"
	>
		<div className="flex flex-col gap-4 py-4">
			{sections.map((section) => (
				<div key={section.label} className="space-y-1">
					<p className="truncate px-5 text-[11px] font-bold whitespace-nowrap text-ink-muted opacity-0 transition-opacity group-hover/side:opacity-100 group-focus-within/side:opacity-100 motion-reduce:transition-none">
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
									<span className="truncate opacity-0 transition-opacity group-hover/side:opacity-100 group-focus-within/side:opacity-100 motion-reduce:transition-none">
										{item.label}
									</span>
								</Link>
							</li>
						))}
					</ul>
				</div>
			))}
		</div>
	</nav>
);

export default SideNav;
