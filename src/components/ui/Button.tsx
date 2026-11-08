import type { ButtonHTMLAttributes } from "react";

// ボタン。primary は画面でいちばん大事な操作（保存など）に 1 つ、secondary はほかの操作、
// ghost は表の中などの控えめな操作、danger は消す操作に使う

export type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";
export type ButtonSize = "sm" | "md";

const base =
	"inline-flex items-center justify-center gap-1.5 rounded-md font-bold whitespace-nowrap transition-colors disabled:cursor-not-allowed disabled:opacity-50";
const variants: Record<ButtonVariant, string> = {
	primary:
		"bg-primary text-on-primary hover:bg-primary-strong disabled:hover:bg-primary",
	secondary:
		"border border-line-strong bg-surface text-ink hover:border-ink-muted hover:bg-surface-sunken",
	ghost: "text-primary hover:bg-primary-soft",
	danger: "border border-danger/40 bg-surface text-danger hover:bg-danger-soft",
};
const sizes: Record<ButtonSize, string> = {
	sm: "h-8 px-3 text-xs",
	md: "h-9 px-4 text-sm",
};

/** ボタンの見た目のクラス（<a> や <label> をボタンの見た目にするときにも使う） */
export const buttonClass = (
	variant: ButtonVariant = "secondary",
	size: ButtonSize = "md",
) => `${base} ${variants[variant]} ${sizes[size]}`;

const Button = ({
	variant = "secondary",
	size = "md",
	className = "",
	type = "button",
	...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
	variant?: ButtonVariant;
	size?: ButtonSize;
}) => (
	<button
		type={type}
		className={`${buttonClass(variant, size)} ${className}`}
		{...props}
	/>
);

export default Button;
