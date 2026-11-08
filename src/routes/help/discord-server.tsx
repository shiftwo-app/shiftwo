import { createFileRoute, Link } from "@tanstack/react-router";
import type { ReactNode } from "react";
import Logo from "../../components/Logo";
import LanguageSwitcher from "../../components/shell/LanguageSwitcher";
import type { MessageKey } from "../../lib/i18n/messages";
import { useT } from "../../lib/i18n/react";
import { translate } from "../../lib/i18n/translate";

// 説明ページ：Discord サーバーのメンバーだけが参加できる団体（ログインしていなくても読める）
export const Route = createFileRoute("/help/discord-server")({
	head: ({ match }) => ({
		meta: [
			{
				title: translate(match.context.locale, "shell.pageTitle", {
					page: translate(match.context.locale, "orgs.discordHelpPageTitle"),
				}),
			},
		],
	}),
	component: HelpPage,
});

/** 訳文の **太字** と [リンク] を要素にする（リンクの先は href） */
const rich = (text: string, href?: string): ReactNode[] =>
	text.split(/(\*\*[^*]+\*\*|\[[^\]]+\])/).map((part, index) => {
		if (part.startsWith("**") && part.endsWith("**")) {
			return <strong key={index}>{part.slice(2, -2)}</strong>;
		}
		if (href && part.startsWith("[") && part.endsWith("]")) {
			return (
				<a key={index} href={href}>
					{part.slice(1, -1)}
				</a>
			);
		}
		return part;
	});

function HelpPage() {
	const t = useT();
	const r = (key: MessageKey, href?: string) => rich(t(key), href);
	const h2 =
		"border-l-4 border-primary pl-3 text-lg leading-snug font-bold text-ink";
	const section = "space-y-3 border-t border-line pt-8";
	const list = "space-y-2 pl-6 marker:text-ink-muted";
	return (
		<main className="mx-auto max-w-2xl px-4 py-10 sm:px-6 sm:py-14">
			<div className="flex items-center justify-between gap-4">
				<Link
					to="/"
					aria-label={t("orgs.discordHelpHomeLinkLabel")}
					className="inline-block text-ink"
				>
					<Logo className="h-14 w-auto" />
				</Link>
				<LanguageSwitcher />
			</div>
			<article className="mt-10 space-y-8 text-base leading-loose text-ink [&_a]:font-bold [&_a]:text-primary [&_a]:underline [&_a]:underline-offset-4 [&_a:hover]:text-primary-strong [&_strong]:font-bold">
				<header className="space-y-3">
					<p className="text-sm text-ink-muted">{t("orgs.discordHelpLabel")}</p>
					<h1 className="text-2xl leading-tight font-bold tracking-tight sm:text-3xl">
						{t("orgs.discordHelpTitle")}
					</h1>
				</header>
				<p>{r("orgs.discordHelpIntro")}</p>

				<section className={section}>
					<h2 className={h2}>{t("orgs.discordHelpOwnerTitle")}</h2>
					<ol className={`list-decimal ${list}`}>
						<li>{r("orgs.discordHelpOwnerStep1", "/account")}</li>
						<li>{r("orgs.discordHelpOwnerStep2")}</li>
						<li>{t("orgs.discordHelpOwnerStep3")}</li>
					</ol>
					<p>{t("orgs.discordHelpOwnerNote")}</p>
				</section>

				<section className={section}>
					<h2 className={h2}>{t("orgs.discordHelpJoinerTitle")}</h2>
					<ol className={`list-decimal ${list}`}>
						<li>{t("orgs.discordHelpJoinerStep1")}</li>
						<li>{t("orgs.discordHelpJoinerStep2")}</li>
						<li>{t("orgs.discordHelpJoinerStep3")}</li>
					</ol>
				</section>

				<section className={section}>
					<h2 className={h2}>{t("orgs.discordHelpLeaveTitle")}</h2>
					<p>{r("orgs.discordHelpLeaveBody1")}</p>
					<p>{t("orgs.discordHelpLeaveBody2")}</p>
				</section>

				<section className={section}>
					<h2 className={h2}>{t("orgs.discordHelpGuestTitle")}</h2>
					<p>{r("orgs.discordHelpGuestBody1")}</p>
					<p>{t("orgs.discordHelpGuestBody2")}</p>
				</section>

				<section className={section}>
					<h2 className={h2}>{t("orgs.discordHelpAvatarTitle")}</h2>
					<p>{r("orgs.discordHelpAvatarBody")}</p>
				</section>

				<section className={section}>
					<h2 className={h2}>{t("orgs.discordHelpDataTitle")}</h2>
					<ul className={`list-disc ${list}`}>
						<li>{t("orgs.discordHelpDataItem1")}</li>
						<li>{t("orgs.discordHelpDataItem2")}</li>
						<li>{t("orgs.discordHelpDataItem3")}</li>
					</ul>
					<p>{t("orgs.discordHelpDataNote")}</p>
				</section>
			</article>
		</main>
	);
}
