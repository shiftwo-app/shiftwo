import type { ReactNode } from "react";

// 画面の中のお知らせ。error は操作の失敗、warn は気をつけること、info は補足、success はできたこと

export type AlertTone = "error" | "warn" | "info" | "success";

const tones: Record<AlertTone, string> = {
	error: "border-danger/40 bg-danger-soft text-danger",
	warn: "border-warn/40 bg-warn-soft text-ink",
	info: "border-line bg-surface-sunken text-ink",
	success: "border-primary/40 bg-primary-soft text-ink",
};

const Alert = ({
	tone = "info",
	children,
	className = "",
}: {
	tone?: AlertTone;
	children: ReactNode;
	className?: string;
}) => (
	<div
		// 失敗はすぐ読み上げ、それ以外は区切りのよいところで読み上げる
		role={tone === "error" ? "alert" : "status"}
		className={`rounded-md border px-3 py-2 text-sm leading-relaxed ${tones[tone]} ${className}`}
	>
		{children}
	</div>
);

export default Alert;
