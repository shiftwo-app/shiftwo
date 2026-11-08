// prisma/schema/models.prisma（共通のモデル定義）に DB ごとの generator と datasource を付けて、
// prisma/generated-schema/<provider>/schema.prisma を作る。postinstall と prisma:generate から呼ぶ。
// Cloudflare Workers 用（runtime = "workerd"）のクライアントのスキーマも <provider>-workerd に作る。
// Node 用のクライアントは WebAssembly を文字列から組み立てるが、Workers ではそれが禁じられているので、
// Workers 用は wasm をファイルとして import するクライアントを別に作る（Cloudflare 向けの build でだけ使う）。
// 生成物は git に入れない（.gitignore）
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
	DATABASE_PROVIDERS,
	type DatabaseProvider,
} from "../src/lib/database-provider.ts";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const models = readFileSync(join(root, "prisma/schema/models.prisma"), "utf8");

const header = (
	provider: DatabaseProvider,
	workerd: boolean,
) => `// このファイルは scripts/prisma-schemas.ts が作る。直接編集しないこと（prisma/schema/models.prisma を直す）

generator client {
  provider            = "prisma-client"
  output              = "../../../src/generated/prisma-${provider}${workerd ? "-workerd" : ""}"
  // prisma/seed.ts を Node でそのまま動かせるよう、生成コードの import に .ts を付ける
  importFileExtension = "ts"${workerd ? '\n  runtime             = "workerd"' : ""}
}

// 接続先は prisma.config.ts（CLI）と src/lib/prisma.server.ts（アプリ）で渡す
datasource db {
  provider = "${provider}"
}

`;

for (const provider of DATABASE_PROVIDERS) {
	for (const workerd of [false, true]) {
		const file = join(
			root,
			"prisma/generated-schema",
			workerd ? `${provider}-workerd` : provider,
			"schema.prisma",
		);
		mkdirSync(dirname(file), { recursive: true });
		writeFileSync(file, header(provider, workerd) + models);
		console.log(`wrote ${file}`);
	}
}
