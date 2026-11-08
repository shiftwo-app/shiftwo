import { createFileRoute, Link } from "@tanstack/react-router";
import Logo from "../../components/Logo";

// 説明ページ：Discord サーバーのメンバーだけが参加できる団体（ログインしていなくても読める）
export const Route = createFileRoute("/help/discord-server")({
	head: () => ({
		meta: [{ title: "Discord サーバーで参加を絞る | シフトヲ" }],
	}),
	component: HelpPage,
});

function HelpPage() {
	const h2 =
		"border-l-4 border-primary pl-3 text-lg leading-snug font-bold text-ink";
	const section = "space-y-3 border-t border-line pt-8";
	const list = "space-y-2 pl-6 marker:text-ink-muted";
	return (
		<main className="mx-auto max-w-2xl px-4 py-10 sm:px-6 sm:py-14">
			<Link
				to="/"
				aria-label="シフトヲ（トップへ）"
				className="inline-block text-ink"
			>
				<Logo className="h-14 w-auto" />
			</Link>
			<article className="mt-10 space-y-8 text-base leading-loose text-ink [&_a]:font-bold [&_a]:text-primary [&_a]:underline [&_a]:underline-offset-4 [&_a:hover]:text-primary-strong [&_strong]:font-bold">
				<header className="space-y-3">
					<p className="text-sm text-ink-muted">ヘルプ</p>
					<h1 className="text-2xl leading-tight font-bold tracking-tight sm:text-3xl">
						Discord サーバーで団体への参加を絞る
					</h1>
				</header>
				<p>
					団体の設定で Discord サーバーを 1 つ指定すると、
					<strong>そのサーバーのメンバーだけ</strong>
					が団体に参加し、シフトを見られるようになります。運営チームの Discord
					サーバーを指定しておけば、招待コードが外に漏れても、チームの外の人は参加できません。
				</p>

				<section className={section}>
					<h2 className={h2}>団体のオーナー・管理する人がすること</h2>
					<ol className={`list-decimal ${list}`}>
						<li>
							<a href="/account">アカウントの設定</a>
							で Discord を連携します（Discord
							でログインしていれば、すでに連携されています）
						</li>
						<li>
							団体の「設定・メンバー」→「Discord
							サーバー」で、参加の条件にするサーバーを選びます。 選べるのは、
							<strong>自分が参加しているサーバー</strong>だけです
						</li>
						<li>いつもどおり招待コードを発行して、メンバーに渡します</li>
					</ol>
					<p>
						この設定を変えられるのは、「団体の設定を変える」権限を持つ人（オーナー・マネージャーなど）です。
					</p>
				</section>

				<section className={section}>
					<h2 className={h2}>参加する人がすること</h2>
					<ol className={`list-decimal ${list}`}>
						<li>
							Discord
							でログインするか、メールでログインしてから、アカウントの設定で
							Discord を連携します
						</li>
						<li>団体の Discord サーバーに参加しておきます</li>
						<li>
							招待コードを入力して参加します。このとき、サーバーのメンバーかどうかを確かめます
						</li>
					</ol>
				</section>

				<section className={section}>
					<h2 className={h2}>サーバーを抜けたとき</h2>
					<p>
						サーバーのメンバーかどうかは、
						<strong>参加するときと、ログインのたび</strong>
						に確かめます。サーバーを抜けた人や、Discord
						の連携を外した人は、その団体を見られなくなります。
						メンバーの情報（表示名やロール）は残るので、サーバーに戻れば、次のログインか「もう一度確かめる」でまた見られます。
					</p>
					<p>
						Discord
						が一時的に応答しないときは、それまでの状態のままにします（Discord
						の不調で、全員が締め出されることはありません）。
					</p>
				</section>

				<section className={section}>
					<h2 className={h2}>ゲスト（サーバーに入っていない協力者）</h2>
					<p>
						外部の協力者など、サーバーに入っていない人にも参加してもらいたいときは、
						<strong>ゲスト</strong>
						のロールの招待コードを渡します。ゲストのロールには「Discord
						サーバーの参加条件を免除する」権限が付いていて、サーバーのメンバーでなくても参加でき、できることはスタッフと同じです。
					</p>
					<p>
						ゲストの招待コードを発行できるのは、「ゲストを招待する」権限を持つ人（オーナー・マネージャー・リーダーなど）です。
						どのロールに免除を付けるかは、団体の「ロール」で変えられます。オーナーは常に免除されます。
					</p>
				</section>

				<section className={section}>
					<h2 className={h2}>アイコン</h2>
					<p>
						Discord を連携している人は、Discord
						のアイコンが一覧などに出ます。団体が Discord
						サーバーを指定していれば、
						<strong>そのサーバーで設定しているアイコン</strong>
						（サーバープロフィール）を使います。連携していない人は、名前の頭文字が出ます。
					</p>
				</section>

				<section className={section}>
					<h2 className={h2}>Discord から読む情報</h2>
					<ul className={`list-disc ${list}`}>
						<li>ユーザー名・アイコン・メールアドレス（ログインのため）</li>
						<li>
							参加しているサーバーの一覧（参加の条件にするサーバーを選ぶため）
						</li>
						<li>
							サーバーでのプロフィール（そのサーバーのメンバーかどうかと、サーバーでのアイコン）
						</li>
					</ul>
					<p>
						メッセージやチャンネルの内容は読みません。Discord
						に何かを書き込むこともありません。
					</p>
				</section>
			</article>
		</main>
	);
}
