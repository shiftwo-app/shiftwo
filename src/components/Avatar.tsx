import { safeAvatarUrl } from "../lib/avatar";
import { initialsOf } from "../lib/discord";

/** 名前から決まる色相（頭文字のとき、人を見分けやすくする） */
const hueOf = (name: string) => {
	let hash = 0;
	for (const char of name) hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
	return hash % 360;
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
}) => {
	// サーバーでも絞っているが、画面でも Discord の CDN 以外は読み込まない
	const src = safeAvatarUrl(url);
	return src ? (
		<img
			src={src}
			alt=""
			width={size}
			height={size}
			loading="lazy"
			referrerPolicy="no-referrer"
			className="inline-block shrink-0 rounded-full object-cover ring-1 ring-line"
			style={{ width: size, height: size }}
		/>
	) : (
		<span
			aria-hidden
			// 頭文字のときは、名前から決まる色を、地の色・文字の色と混ぜる（ダークモードでも読める組み合わせになる）
			className="inline-flex shrink-0 items-center justify-center rounded-full leading-none font-bold ring-1 ring-line"
			style={{
				width: size,
				height: size,
				backgroundColor: `color-mix(in srgb, hsl(${hueOf(name)} 60% 50%) 22%, var(--surface))`,
				color: `color-mix(in srgb, hsl(${hueOf(name)} 60% 40%) 65%, var(--ink))`,
				fontSize: Math.round(size * 0.5),
			}}
		>
			{initialsOf(name)}
		</span>
	);
};

export default Avatar;
