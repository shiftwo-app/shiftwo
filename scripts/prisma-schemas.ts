// prisma/schema/models.prisma（共通のモデル定義）に DB ごとの generator と datasource を付けて、
// prisma/generated-schema/<provider>/schema.prisma を作る。postinstall と prisma:generate から呼ぶ。
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
) => `// このファイルは scripts/prisma-schemas.ts が作る。直接編集しないこと（prisma/schema/models.prisma を直す）

generator client {
  provider            = "prisma-client"
  output              = "../../../src/generated/prisma-${provider}"
  // prisma/seed.ts を Node でそのまま動かせるよう、生成コードの import に .ts を付ける
  importFileExtension = "ts"
}

// 接続先は prisma.config.ts（CLI）と src/lib/prisma.server.ts（アプリ）で渡す
datasource db {
  provider = "${provider}"
}

`;

for (const provider of DATABASE_PROVIDERS) {
	const file = join(root, "prisma/generated-schema", provider, "schema.prisma");
	mkdirSync(dirname(file), { recursive: true });
	writeFileSync(file, header(provider) + models);
	console.log(`wrote ${file}`);
}
