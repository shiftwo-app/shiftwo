// Cloudflare Workers の binding（wrangler.jsonc）の型。使うところだけを書く。
// @cloudflare/workers-types を全部読み込むと、ブラウザ（DOM）の型とぶつかるため
declare module "cloudflare:workers" {
	export const env: {
		DATABASE_PROVIDER?: string;
		/** DATABASE_PROVIDER=postgresql のとき */
		HYPERDRIVE?: { connectionString: string };
		/** DATABASE_PROVIDER=sqlite のとき（D1Database。型は @prisma/adapter-d1 に合わせて渡す） */
		DB?: object;
		/** STORAGE_DRIVER=r2 のとき */
		BUCKET?: import("../lib/storage/r2-store.server").R2BucketLike;
		/** MAIL_TRANSPORT=cloudflare のとき（Cloudflare Email Service） */
		EMAIL?: {
			send(message: {
				from: string | { name: string; email: string };
				to: string;
				subject: string;
				text?: string;
				html?: string;
			}): Promise<{ messageId: string }>;
		};
		MAIL_FROM?: string;
		MAIL_FROM_NAME?: string;
		STORAGE_DRIVER?: string;
	};
	export function waitUntil(promise: Promise<unknown>): void;
}
