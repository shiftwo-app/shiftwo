import { useRouter } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { useT } from "../../lib/i18n/react";
import type { ShiftScopeParams } from "../../lib/shift-scope";
import {
	clearTimetableFn,
	type getTimetableFn,
} from "../../server/timetable.functions";
import Alert from "../ui/Alert";
import Button from "../ui/Button";
import PageHeader from "../ui/PageHeader";
import SessionList from "./SessionList";
import TimetableGrid from "./TimetableGrid";
import TimetableImport from "./TimetableImport";

type Page = Awaited<ReturnType<typeof getTimetableFn>>;
type Scope = ShiftScopeParams & { eventSlug: string };

/** イベントのタイムテーブル（FR-6）：部屋ごとの表、一覧、（管理できる人には）取り込みと削除 */
const TimetablePage = ({ page, scope }: { page: Page; scope: Scope }) => {
	const t = useT();
	const router = useRouter();
	const clear = useServerFn(clearTimetableFn);
	const [confirming, setConfirming] = useState(false);
	const [cleared, setCleared] = useState(false);
	const count = page.sessions.length;

	const clearAll = async () => {
		const result = await clear({ data: scope });
		setConfirming(false);
		if (result.ok) {
			setCleared(true);
			await router.invalidate();
		}
	};

	return (
		<main className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
			<PageHeader
				title={t("timetable.pageTitle")}
				description={t("timetable.description")}
				actions={
					page.canManage &&
					count > 0 &&
					(confirming ? (
						<>
							<Button variant="ghost" onClick={() => setConfirming(false)}>
								{t("timetable.cancel")}
							</Button>
							<Button variant="danger" onClick={() => void clearAll()}>
								{t("timetable.clearConfirm", { count })}
							</Button>
						</>
					) : (
						<Button variant="ghost" onClick={() => setConfirming(true)}>
							{t("timetable.clearAll")}
						</Button>
					))
				}
			/>
			<div className="space-y-8">
				{cleared && <Alert tone="success">{t("timetable.cleared")}</Alert>}
				{page.canManage && (
					<TimetableImport scope={scope} period={page.period} />
				)}
				{count === 0 ? (
					<p className="text-sm text-ink-muted">
						{page.canManage
							? t("timetable.noneCanImport")
							: t("timetable.none")}
					</p>
				) : (
					<>
						<section aria-labelledby="timetable-grid" className="space-y-3">
							<h2 id="timetable-grid" className="text-base font-bold text-ink">
								{t("timetable.gridTitle")}
							</h2>
							<TimetableGrid sessions={page.sessions} />
						</section>
						<section aria-labelledby="timetable-list" className="space-y-3">
							<h2 id="timetable-list" className="text-base font-bold text-ink">
								{t("timetable.listTitle")}
							</h2>
							<SessionList
								sessions={page.sessions}
								scope={scope}
								canManage={page.canManage}
							/>
						</section>
					</>
				)}
			</div>
		</main>
	);
};

export default TimetablePage;
