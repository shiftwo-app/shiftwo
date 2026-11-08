import type { ReactNode } from "react";

// 小さな札（ロール・状態など）。color を渡すと、その色の点を付ける

const Badge = ({
	children,
	color,
	tone = "neutral",
}: {
	children: ReactNode;
	color?: string;
	tone?: "neutral" | "primary" | "warn";
}) => {
	const tones = {
		neutral: "border-line bg-surface text-ink",
		primary: "border-primary/30 bg-primary-soft text-ink",
		warn: "border-warn/40 bg-warn-soft text-ink",
	};
	return (
		<span
			className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-xs leading-5 ${tones[tone]}`}
		>
			{color && (
				<span
					aria-hidden="true"
					className="size-2 rounded-full"
					style={{ backgroundColor: color }}
				/>
			)}
			{children}
		</span>
	);
};

export default Badge;
