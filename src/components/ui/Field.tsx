import { useId } from "react";
import type { ReactNode } from "react";

/**
 * ラベル・補足・エラーの付いた入力欄の枠。children には id を受け取って入力欄を返す関数を渡す
 * （ラベルと入力欄、補足と aria-describedby を確実に結びつけるため）。入力欄には .control のクラスを付ける
 *
 *   <Field label="団体名" hint="あとで変えられます">
 *     {(props) => <input {...props} className="control" />}
 *   </Field>
 */
const Field = ({
	label,
	hint,
	error,
	className = "",
	children,
}: {
	label: ReactNode;
	hint?: ReactNode;
	error?: string;
	className?: string;
	children: (props: {
		id: string;
		"aria-describedby"?: string;
		"aria-invalid"?: true;
	}) => ReactNode;
}) => {
	const id = useId();
	const describedBy =
		[hint ? `${id}-hint` : null, error ? `${id}-error` : null]
			.filter(Boolean)
			.join(" ") || undefined;
	return (
		<div className={`flex flex-col gap-1 ${className}`}>
			<label htmlFor={id} className="text-sm font-bold text-ink">
				{label}
			</label>
			{children({
				id,
				"aria-describedby": describedBy,
				...(error ? { "aria-invalid": true as const } : {}),
			})}
			{hint && (
				<p id={`${id}-hint`} className="text-xs text-ink-muted">
					{hint}
				</p>
			)}
			{error && (
				<p id={`${id}-error`} className="text-xs font-bold text-danger">
					{error}
				</p>
			)}
		</div>
	);
};

export default Field;
