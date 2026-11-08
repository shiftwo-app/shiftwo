import { initialsOf } from "../lib/discord";

/** 名前から決まる背景色（頭文字のとき） */
const colorOf = (name: string) => {
	let hash = 0;
	for (const char of name) hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
	return `hsl(${hash % 360} 55% 45%)`;
};

/**
 * アイコン。URL（Discord サーバーでのアイコン・Discord のアイコン）があれば画像、なければ名前の頭文字
 */
const Avatar = ({
	name,
	url,
	size = 24,
}: {
	name: string;
	url?: string | null;
	size?: number;
}) =>
	url ? (
		<img
			src={url}
			alt=""
			width={size}
			height={size}
			loading="lazy"
			referrerPolicy="no-referrer"
			className="inline-block shrink-0 rounded-full object-cover"
			style={{ width: size, height: size }}
		/>
	) : (
		<span
			aria-hidden
			className="inline-flex shrink-0 items-center justify-center rounded-full font-semibold text-white"
			style={{
				width: size,
				height: size,
				fontSize: Math.round(size * 0.5),
				backgroundColor: colorOf(name),
			}}
		>
			{initialsOf(name)}
		</span>
	);

export default Avatar;
