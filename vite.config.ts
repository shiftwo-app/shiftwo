import tailwindcss from "@tailwindcss/vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact from "@vitejs/plugin-react";
import { defineConfig, lazyPlugins } from "vite-plus";

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
	},
	plugins: lazyPlugins(() => [
		tailwindcss(),
		tanstackStart(),
		// React の plugin は Start の plugin より後に置く
		viteReact(),
	]),
});
