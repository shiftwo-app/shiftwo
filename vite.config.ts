import { fileURLToPath } from "node:url";
import tailwindcss from "@tailwindcss/vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact from "@vitejs/plugin-react";
import { defineConfig, lazyPlugins } from "vite-plus";

// CLOUDFLARE=1 のときは Cloudflare Workers 向けに build・dev する（pnpm build:cloudflare など）。
// それ以外（Node・テスト）は今までどおり
const cloudflareBuild = process.env.CLOUDFLARE === "1";
// Cloudflare 向けの build に入れる DB（sqlite は D1、postgresql は Hyperdrive）。
// wrangler.jsonc の DATABASE_PROVIDER と同じにする（食い違うと起動時に止まる）
const cloudflareDatabase =
	process.env.CLOUDFLARE_DATABASE === "postgresql" ? "hyperdrive" : "d1";
const src = (path: string) =>
	fileURLToPath(new URL(`./src/${path}`, import.meta.url));

export default defineConfig({
	// Biome のときの書式（タブ・ダブルクォート）を引き継ぐ
	fmt: {
		useTabs: true,
		printWidth: 80,
		// prisma/migrations は Prisma が生成する。misc は資料置き場なので書式をそろえない
		ignorePatterns: [
			"src/routeTree.gen.ts",
			"pnpm-lock.yaml",
			"prisma/migrations/**",
			"misc/**",
		],
	},
	lint: {
		ignorePatterns: ["src/routeTree.gen.ts"],
		jsPlugins: [{ name: "vite-plus", specifier: "vite-plus/oxlint-plugin" }],
		rules: {
			"vite-plus/prefer-vite-plus-imports": "error",
		},
		options: {
			typeAware: true,
			typeCheck: true,
		},
	},
	server: {
		port: 3000,
	},
	resolve: {
		tsconfigPaths: true,
		// 動かす場所で変わる部分（src/platform/types.ts）を、Workers 用に差し替える
		alias: cloudflareBuild
			? [
					{
						find: /^#platform$/,
						replacement: src("platform/cloudflare.server.ts"),
					},
					{
						find: /^#worker-exports$/,
						replacement: src("platform/worker-exports.cloudflare.ts"),
					},
					{
						find: /^#cloudflare-database$/,
						replacement: src(
							`platform/cloudflare-${cloudflareDatabase}.server.ts`,
						),
					},
				]
			: [],
	},
	plugins: lazyPlugins(async () => [
		// Cloudflare の plugin は最初に置く。SSR の環境を Workers（workerd）で動かす
		...(cloudflareBuild
			? [
					(await import("@cloudflare/vite-plugin")).cloudflare({
						viteEnvironment: { name: "ssr" },
					}),
				]
			: []),
		tailwindcss(),
		tanstackStart(),
		// React の plugin は Start の plugin より後に置く
		viteReact(),
	]),
});
