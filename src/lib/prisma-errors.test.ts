import { describe, expect, it } from "vite-plus/test";
import { isPrismaError, PRISMA_ERROR } from "./prisma-errors";

const knownError = (code: string) =>
	Object.assign(new Error("boom"), {
		name: "PrismaClientKnownRequestError",
		code,
	});

describe("isPrismaError", () => {
	it("どちらのクライアントのエラーでも、コードで見分ける", () => {
		expect(isPrismaError(knownError("P2025"), PRISMA_ERROR.notFound)).toBe(
			true,
		);
		expect(
			isPrismaError(knownError("P2025"), PRISMA_ERROR.foreignKeyViolation),
		).toBe(false);
	});

	it("Prisma のエラーでなければ false", () => {
		expect(
			isPrismaError(
				Object.assign(new Error(), { code: "P2025" }),
				PRISMA_ERROR.notFound,
			),
		).toBe(false);
		expect(isPrismaError(null, PRISMA_ERROR.notFound)).toBe(false);
		expect(isPrismaError("P2025", PRISMA_ERROR.notFound)).toBe(false);
	});
});
