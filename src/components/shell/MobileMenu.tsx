import { Link } from "@tanstack/react-router";
import { useRef } from "react";
import { useT } from "../../lib/i18n/react";
import Button from "../ui/Button";
import LanguageSwitcher from "./LanguageSwitcher";

/**
 * スマートフォンの見出しのメニュー（FR-3-4：ハンバーガーのドロワー）。狭い画面でだけ出す。
 * <dialog> で開くので、Esc で閉じ、開いているあいだは後ろを操作できない
 */
const MobileMenu = ({
	userLabel,
	onSignOut,
}: {
	userLabel: string;
	onSignOut: () => void;
}) => {
	const t = useT();
	const dialogRef = useRef<HTMLDialogElement>(null);
	const close = () => dialogRef.current?.close();

	return (
		<>
			<button
				type="button"
				aria-label={t("shell.menuOpen")}
				aria-haspopup="dialog"
				onClick={() => dialogRef.current?.showModal()}
				className="inline-flex size-10 items-center justify-center rounded-md text-ink hover:bg-surface-sunken sm:hidden"
			>
				<svg
					aria-hidden="true"
					viewBox="0 0 24 24"
					className="size-6"
					fill="none"
					stroke="currentColor"
					strokeWidth="2"
					strokeLinecap="round"
				>
					<path d="M4 7h16M4 12h16M4 17h16" />
				</svg>
			</button>
			<dialog
				ref={dialogRef}
				aria-label={t("shell.menuTitle")}
				// 背景を押したら閉じる（中身の上で押したときは閉じない）
				onClick={(event) => {
					if (event.target === dialogRef.current) close();
				}}
				className="m-0 ml-auto h-dvh max-h-none w-72 max-w-[85vw] border-l border-line bg-surface p-0 text-ink backdrop:bg-black/50"
			>
				<div className="flex h-full flex-col gap-6 p-5">
					<div className="flex items-center justify-between">
						<p className="text-sm font-bold">{t("shell.menuTitle")}</p>
						<button
							type="button"
							aria-label={t("shell.menuClose")}
							onClick={close}
							className="inline-flex size-10 items-center justify-center rounded-md hover:bg-surface-sunken"
						>
							<svg
								aria-hidden="true"
								viewBox="0 0 24 24"
								className="size-5"
								fill="none"
								stroke="currentColor"
								strokeWidth="2"
								strokeLinecap="round"
							>
								<path d="M6 6l12 12M18 6L6 18" />
							</svg>
						</button>
					</div>
					<nav className="flex flex-col gap-1 text-sm">
						<Link
							to="/account"
							onClick={close}
							className="rounded-md px-3 py-2.5 hover:bg-surface-sunken"
						>
							<span className="block text-xs text-ink-muted">
								{t("shell.menuAccount")}
							</span>
							<span className="block truncate font-bold">{userLabel}</span>
						</Link>
					</nav>
					<LanguageSwitcher />
					<div className="mt-auto">
						<Button
							variant="secondary"
							className="w-full"
							onClick={() => {
								close();
								onSignOut();
							}}
						>
							{t("shell.signOut")}
						</Button>
					</div>
				</div>
			</dialog>
		</>
	);
};

export default MobileMenu;
