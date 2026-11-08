import {
	createFileRoute,
	Link,
	Outlet,
	redirect,
	useNavigate,
} from "@tanstack/react-router";
import Logo from "../components/Logo";
import Button from "../components/ui/Button";
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
		<div className="min-h-dvh">
			<header className="bg-paper">
				<div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4 sm:px-6">
					<Link
						to="/"
						aria-label="シフトヲ（団体の一覧へ）"
						className="text-ink"
					>
						<Logo className="h-11 w-auto" />
					</Link>
					<div className="flex items-center gap-2 text-sm">
						<Link
							to="/account"
							className="flex items-center gap-2 rounded-md px-2 py-1 text-ink hover:bg-surface-sunken"
						>
							<span className="max-w-40 truncate">
								{user.name || user.email}
							</span>
						</Link>
						<Button variant="ghost" size="sm" onClick={signOut}>
							ログアウト
						</Button>
					</div>
				</div>
			</header>
			<Outlet />
		</div>
	);
}
