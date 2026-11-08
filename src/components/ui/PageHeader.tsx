import type { ReactNode } from "react";

/** 画面の見出し。右に、その画面での主な操作を置ける */
const PageHeader = ({
	title,
	description,
	actions,
}: {
	title: ReactNode;
	description?: ReactNode;
	actions?: ReactNode;
}) => (
	<div className="flex flex-wrap items-end justify-between gap-4 pb-6">
		<div className="max-w-2xl space-y-1">
			<h1 className="text-2xl leading-tight font-bold tracking-tight text-ink">
				{title}
			</h1>
			{description && (
				<p className="text-sm leading-relaxed text-ink-muted">{description}</p>
			)}
		</div>
		{actions && <div className="flex flex-wrap gap-2">{actions}</div>}
	</div>
);

export default PageHeader;
