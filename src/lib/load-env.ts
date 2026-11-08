import { existsSync } from "node:fs";

// Prisma 7 は .env を自動で読まないので、あれば読む。
// すでに設定されている環境変数（シェルや本番の設定）は上書きしない
export const loadEnvFileIfExists = (path = ".env") => {
	if (existsSync(path)) process.loadEnvFile(path);
};
