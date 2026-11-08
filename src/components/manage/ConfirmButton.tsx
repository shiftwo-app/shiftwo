import { useState } from "react";
import Button from "../ui/Button";
import { useT } from "../../lib/i18n/react";

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
	const t = useT();
	const [armed, setArmed] = useState(false);
	return armed ? (
		<span className="inline-flex flex-wrap items-center gap-2">
			{/* 確かめる段階は、塗りの赤ではっきり危ない操作だと分かるようにする */}
			<button
				type="button"
				onClick={() => {
					setArmed(false);
					onConfirm();
				}}
				className="inline-flex min-h-8 items-center justify-center rounded-md bg-danger px-3 py-1 text-left text-xs leading-snug font-bold text-white transition-opacity hover:opacity-90 dark:text-paper"
			>
				{confirmLabel}
			</button>
			<Button variant="ghost" size="sm" onClick={() => setArmed(false)}>
				{t("common.cancel")}
			</Button>
		</span>
	) : (
		<Button variant="danger" size="sm" onClick={() => setArmed(true)}>
			{label}
		</Button>
	);
};

export default ConfirmButton;
