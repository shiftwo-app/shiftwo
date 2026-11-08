import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import type { FormEvent } from "react";
import Alert from "../../../components/ui/Alert";
import Button from "../../../components/ui/Button";
import Field from "../../../components/ui/Field";
import PageHeader from "../../../components/ui/PageHeader";
import Section from "../../../components/ui/Section";
import { NAME_MAX_LENGTH } from "../../../lib/profile";
import { createOrganizationFn } from "../../../server/org.functions";

export const Route = createFileRoute("/_authed/orgs/new")({
	head: () => ({ meta: [{ title: "団体を作る | シフトヲ" }] }),
	component: NewOrgPage,
});

function NewOrgPage() {
	const { user } = Route.useRouteContext();
	const router = useRouter();
	const create = useServerFn(createOrganizationFn);
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

	return (
		<main className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
			<PageHeader title="団体を作る" />
			<form onSubmit={submit}>
				<Section
					id="new-org-basics"
					title="団体"
					description="団体の名前と、団体のページの URL を決めます。"
				>
					<Field label="団体名" hint="例：技術カンファレンス 2026 運営">
						{(props) => (
							<input
								{...props}
								required
								maxLength={80}
								value={name}
								onChange={(event) => setName(event.target.value)}
								className="control w-full max-w-md"
							/>
						)}
					</Field>
					<Field
						label="URL"
						hint="/o/ のあとに付く名前。半角の英小文字・数字・ハイフン"
					>
						{(props) => (
							<div className="flex w-full max-w-md items-stretch">
								<span
									aria-hidden="true"
									className="flex items-center rounded-l-md border border-r-0 border-line-strong bg-surface-sunken px-2.5 font-mono text-sm text-ink-muted"
								>
									/o/
								</span>
								<input
									{...props}
									required
									minLength={3}
									maxLength={32}
									pattern="[a-z0-9](?:[a-z0-9\-]*[a-z0-9])?"
									value={slug}
									onChange={(event) =>
										setSlug(event.target.value.toLowerCase())
									}
									className="control min-w-0 flex-1 rounded-l-none font-mono"
								/>
							</div>
						)}
					</Field>
				</Section>
				<Section
					id="new-org-you"
					title="あなた"
					description="団体の中では、この名前で表示されます。"
				>
					<Field label="この団体でのあなたの表示名">
						{(props) => (
							<input
								{...props}
								required
								maxLength={NAME_MAX_LENGTH}
								value={displayName}
								onChange={(event) => setDisplayName(event.target.value)}
								className="control w-full max-w-md"
							/>
						)}
					</Field>
				</Section>
				<div className="space-y-4 border-t border-line pt-6 lg:pl-[18.5rem]">
					{errors.length > 0 && (
						<Alert tone="error">
							<ul className="space-y-1">
								{errors.map((message) => (
									<li key={message}>{message}</li>
								))}
							</ul>
						</Alert>
					)}
					<Button type="submit" variant="primary" disabled={busy}>
						作る
					</Button>
				</div>
			</form>
		</main>
	);
}
