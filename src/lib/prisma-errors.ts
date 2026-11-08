// Prisma のエラーの見分け方。クライアントが DB ごとに 2 つ（Postgres・SQLite）あり、
// それぞれ別の PrismaClientKnownRequestError クラスを持つので、instanceof ではなくコードで見る

/** Prisma のエラーコード。https://www.prisma.io/docs/orm/reference/error-reference */
export const PRISMA_ERROR = {
	/** 一意制約の違反 */
	uniqueViolation: "P2002",
	/** 外部キー（参照先）がない */
	foreignKeyViolation: "P2003",
	/** 対象のレコードがない */
	notFound: "P2025",
} as const;

export const isPrismaError = (error: unknown, code: string): boolean =>
	typeof error === "object" &&
	error !== null &&
	"code" in error &&
	(error as { code: unknown }).code === code &&
	(error as { name?: unknown }).name === "PrismaClientKnownRequestError";
