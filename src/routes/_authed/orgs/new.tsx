import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import type { FormEvent } from "react";
import Alert from "../../../components/ui/Alert";
import Button from "../../../components/ui/Button";
import Field from "../../../components/ui/Field";
import PageHeader from "../../../components/ui/PageHeader";
import Section from "../../../components/ui/Section";
import { useT } from "../../../lib/i18n/react";
import { translate } from "../../../lib/i18n/translate";
import { NAME_MAX_LENGTH } from "../../../lib/profile";
import { createOrganizationFn } from "../../../server/org.functions";

export const Route = createFileRoute("/_authed/orgs/new")({
	head: ({ match }) => ({
		meta: [
			{
				title: translate(match.context.locale, "shell.pageTitle", {
					page: translate(match.context.locale, "orgs.create"),
				}),
			},
		],
	}),
	component: NewOrgPage,
});

function NewOrgPage() {
	const { user } = Route.useRouteContext();
	const router = useRouter();
	const t = useT();
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
			setErrors([t("orgs.createFailed")]);
		} finally {
			setBusy(false);
		}
	};

	return (
		<main className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
			<PageHeader title={t("orgs.create")} />
			<form onSubmit={submit}>
				<Section
					id="new-org-basics"
					title={t("orgs.newBasicsTitle")}
					description={t("orgs.newBasicsDescription")}
				>
					<Field label={t("orgs.nameLabel")} hint={t("orgs.nameHint")}>
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
					<Field label={t("orgs.slugLabel")} hint={t("orgs.slugHint")}>
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
					title={t("orgs.newYouTitle")}
					description={t("orgs.newYouDescription")}
				>
					<Field label={t("orgs.displayNameLabel")}>
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
						{t("orgs.createSubmit")}
					</Button>
				</div>
			</form>
		</main>
	);
}
