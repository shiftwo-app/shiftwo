import type { ReactNode } from "react";

/**
 * 設定などの画面の区切り。広い画面では、見出しと説明を左、中身を右に置く 2 段組みにする
 * （カードを並べず、罫線で区切る）。狭い画面では縦に並ぶ
 */
const Section = ({
	id,
	title,
	description,
	children,
}: {
	/** 見出しの id（aria-labelledby に使う） */
	id: string;
	title: ReactNode;
	description?: ReactNode;
	children: ReactNode;
}) => (
	<section
		aria-labelledby={id}
		className="grid gap-4 border-t border-line py-8 first:border-t-0 first:pt-2 lg:grid-cols-[16rem_1fr] lg:gap-10"
	>
		<div className="space-y-1">
			<h2 id={id} className="text-base leading-snug font-bold text-ink">
				{title}
			</h2>
			{description && (
				<p className="text-sm leading-relaxed text-ink-muted">{description}</p>
			)}
		</div>
		<div className="min-w-0 space-y-4">{children}</div>
	</section>
);

export default Section;
