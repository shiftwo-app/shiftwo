// Postgres と SQLite（D1）のマイグレーションを、ずれないように一緒に扱う。
//
//   pnpm prisma:migrate new <名前>  … 両方の DB に同じ名前のマイグレーションを作る
//                                    （Postgres は DATABASE_URL の DB、SQLite は prisma/dev.db を使う）
//   pnpm prisma:migrate check       … 両方のマイグレーションが prisma/schema/models.prisma と一致するかを見る
//                                    （Postgres は SHADOW_DATABASE_URL があるときだけ。ないと飛ばす）
import { spawnSync } from "node:child_process";
import type { DatabaseProvider } from "../src/lib/database-provider.ts";
import { loadEnvFileIfExists } from "../src/lib/load-env.ts";

loadEnvFileIfExists();

const SQLITE_DEV_URL = "file:./prisma/dev.db";

const prisma = (
	provider: DatabaseProvider,
	args: string[],
	env: Record<string, string> = {},
) => {
	const result = spawnSync("pnpm", ["exec", "prisma", ...args], {
		stdio: "inherit",
		env: { ...process.env, DATABASE_PROVIDER: provider, ...env },
	});
	return result.status ?? 1;
};

const generateSchemas = () => {
	const result = spawnSync("node", ["scripts/prisma-schemas.ts"], {
		stdio: "inherit",
	});
	if (result.status !== 0) process.exit(result.status ?? 1);
};

const schemaPath = (provider: DatabaseProvider) =>
	`prisma/generated-schema/${provider}/schema.prisma`;

const [command, name] = process.argv.slice(2);

if (command === "new") {
	if (!name) {
		console.error("使い方: pnpm prisma:migrate new <名前>");
		process.exit(1);
	}
	generateSchemas();
	for (const provider of ["postgresql", "sqlite"] as const) {
		const env: Record<string, string> =
			provider === "sqlite" ? { DATABASE_URL: SQLITE_DEV_URL } : {};
		const status = prisma(provider, ["migrate", "dev", "--name", name], env);
		if (status !== 0) process.exit(status);
	}
} else if (command === "check") {
	generateSchemas();
	let failed = false;
	for (const provider of ["postgresql", "sqlite"] as const) {
		if (provider === "postgresql" && !process.env.SHADOW_DATABASE_URL) {
			console.warn("postgresql: SHADOW_DATABASE_URL がないので飛ばします");
			continue;
		}
		// Postgres は shadow DB（SHADOW_DATABASE_URL）にマイグレーションを当てて比べる。DATABASE_URL はそのまま
		const env: Record<string, string> =
			provider === "sqlite" ? { DATABASE_URL: SQLITE_DEV_URL } : {};
		console.log(`${provider}: マイグレーションとスキーマを比べます`);
		const status = prisma(
			provider,
			[
				"migrate",
				"diff",
				"--from-migrations",
				`prisma/migrations/${provider}`,
				"--to-schema",
				schemaPath(provider),
				"--exit-code",
			],
			env,
		);
		if (status !== 0) {
			console.error(
				`${provider}: マイグレーションがスキーマと合っていません（pnpm prisma:migrate new <名前> で作ってください）`,
			);
			failed = true;
		}
	}
	process.exit(failed ? 1 : 0);
} else {
	console.error(
		"使い方: pnpm prisma:migrate new <名前> | pnpm prisma:migrate check",
	);
	process.exit(1);
}
