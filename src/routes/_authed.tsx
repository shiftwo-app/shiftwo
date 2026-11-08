import {
	createFileRoute,
	Outlet,
	redirect,
	useNavigate,
} from "@tanstack/react-router";
import { authClient } from "../lib/auth-client";
import { getSession } from "../server/session.functions";

// ログインが必要な画面のまとまり。ここで一度だけログインを確かめ、していなければログイン画面へ
export const Route = createFileRoute("/_authed")({
	beforeLoad: async ({ location }) => {
		const user = await getSession();
		if (!user) {
			throw redirect({ to: "/login", search: { redirect: location.href } });
		}
		// はじめての人は、名前を決めてから
		if (!user.onboarded) {
			throw redirect({ to: "/welcome", search: { redirect: location.href } });
		}
		return { user };
	},
	component: AuthedLayout,
});

function AuthedLayout() {
	const { user } = Route.useRouteContext();
	const navigate = useNavigate();

	const signOut = async () => {
		await authClient.signOut();
		await navigate({ to: "/login", search: { redirect: "/" } });
	};

	return (
		<div>
			<header className="flex items-center justify-between border-b px-4 py-2">
				<span className="font-bold">shiftwo</span>
				<div className="flex items-center gap-3 text-sm">
					<span>{user.name || user.email}</span>
					<button
						type="button"
						onClick={signOut}
						className="rounded border px-3 py-1"
					>
						ログアウト
					</button>
				</div>
			</header>
			<Outlet />
		</div>
	);
}
