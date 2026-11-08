import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useId, useState } from "react";
import type { FormEvent } from "react";
import { NAME_MAX_LENGTH } from "../../../lib/profile";
import { createOrganizationFn } from "../../../server/org.functions";

export const Route = createFileRoute("/_authed/orgs/new")({
	head: () => ({ meta: [{ title: "団体を作る | shiftwo" }] }),
	component: NewOrgPage,
});

function NewOrgPage() {
	const { user } = Route.useRouteContext();
	const router = useRouter();
	const create = useServerFn(createOrganizationFn);
	const id = useId();
	const [name, setName] = useState("");
	const [slug, setSlug] = useState("");
	const [displayName, setDisplayName] = useState(user.name);
	const [busy, setBusy] = useState(false);
	const [errors, setErrors] = useState<string[]>([]);

	const submit = async (event: FormEvent<HTMLFormElement>) => {
		event.preventDefault();
		setBusy(true);
		try {
			const result = await create({ data: { name, slug, displayName } });
			if (!result.ok) {
				setErrors(result.errors);
				return;
			}
			await router.navigate({
				to: "/o/$orgSlug",
				params: { orgSlug: result.slug },
			});
		} catch (error) {
			console.error(error);
			setErrors(["作れませんでした。時間をおいて、もう一度試してください"]);
		} finally {
			setBusy(false);
		}
	};

	const field = "block space-y-1 text-sm";
	const control = "w-full rounded border px-3 py-2";
	return (
		<main className="mx-auto max-w-md space-y-6 p-6">
			<h1 className="text-2xl font-bold">団体を作る</h1>
			<form onSubmit={submit} className="space-y-4">
				<label htmlFor={`${id}-name`} className={field}>
					<span>団体名（例：技術カンファレンス 2026 運営）</span>
					<input
						id={`${id}-name`}
						required
						maxLength={80}
						value={name}
						onChange={(event) => setName(event.target.value)}
						className={control}
					/>
				</label>
				<label htmlFor={`${id}-slug`} className={field}>
					<span>
						URL（/o/ のあとに付く名前。半角の英小文字・数字・ハイフン）
					</span>
					<input
						id={`${id}-slug`}
						required
						minLength={3}
						maxLength={32}
						pattern="[a-z0-9](?:[a-z0-9\-]*[a-z0-9])?"
						value={slug}
						onChange={(event) => setSlug(event.target.value.toLowerCase())}
						className={control}
					/>
				</label>
				<label htmlFor={`${id}-display`} className={field}>
					<span>この団体でのあなたの表示名</span>
					<input
						id={`${id}-display`}
						required
						maxLength={NAME_MAX_LENGTH}
						value={displayName}
						onChange={(event) => setDisplayName(event.target.value)}
						className={control}
					/>
				</label>
				<button
					type="submit"
					disabled={busy}
					className="w-full rounded bg-blue-600 px-4 py-2 font-semibold text-white disabled:opacity-50"
				>
					作る
				</button>
			</form>
			{errors.length > 0 && (
				<ul role="alert" className="text-sm text-red-700">
					{errors.map((message) => (
						<li key={message}>{message}</li>
					))}
				</ul>
			)}
		</main>
	);
}
