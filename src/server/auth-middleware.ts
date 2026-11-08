import { createMiddleware } from "@tanstack/react-start";
import { getCurrentUser } from "./session.server";

/** server function 用：ログインしていなければ止め、していれば context.user に入れる */
export const requireUserMiddleware = createMiddleware({
	type: "function",
}).server(async ({ next }) => {
	const user = await getCurrentUser();
	if (!user) throw new Error("Unauthorized");
	return next({ context: { user } });
});
