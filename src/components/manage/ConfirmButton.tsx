import { useState } from "react";

/**
 * 消すなど、取り消せない操作のボタン。1 回目で「本当に〜」に変わり、2 回目で実行する
 * （ブラウザの confirm ダイアログは使わない）
 */
const ConfirmButton = ({
	label,
	confirmLabel,
	onConfirm,
}: {
	label: string;
	confirmLabel: string;
	onConfirm: () => void;
}) => {
	const [armed, setArmed] = useState(false);
	return armed ? (
		<span className="flex items-center gap-2 text-sm">
			<button
				type="button"
				onClick={() => {
					setArmed(false);
					onConfirm();
				}}
				className="rounded bg-red-600 px-2 py-0.5 font-semibold text-white"
			>
				{confirmLabel}
			</button>
			<button
				type="button"
				onClick={() => setArmed(false)}
				className="underline"
			>
				やめる
			</button>
		</span>
	) : (
		<button
			type="button"
			onClick={() => setArmed(true)}
			className="text-sm text-red-700 underline"
		>
			{label}
		</button>
	);
};

export default ConfirmButton;
