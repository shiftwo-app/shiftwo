import { useRouter } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useId, useState } from "react";
import { toCsv } from "../../lib/csv";
import { useT } from "../../lib/i18n/react";
import type { ShiftScopeParams } from "../../lib/shift-scope";
import {
	detectTimetableFormat,
	type TimetableFormat,
} from "../../lib/timetable";
import { importTimetableFn } from "../../server/timetable.functions";
import { formatTime } from "../timeline/layout";
import Alert from "../ui/Alert";
import Button from "../ui/Button";

type Result = Awaited<ReturnType<typeof importTimetableFn>>;
type Scope = ShiftScopeParams & { eventSlug: string };

/** ひな形の例の日付（イベントの期間があればその初日、なければ明日。日本時間） */
const exampleDate = (period: { start: number } | null): string => {
	const base = period?.start ?? Date.now() + 24 * 60 * 60_000;
	return new Date(base + 9 * 60 * 60_000).toISOString().slice(0, 10);
};

/**
 * タイムテーブルの取り込み（FR-6-A）。ファイルを選んで「確かめる」と、セッションごとの問題を一覧にする。
 * 問題がなければ「取り込む」で、このイベントのタイムテーブルをまるごと置き換える（サーバーでも確かめ直す）
 */
const TimetableImport = ({
	scope,
	period,
}: {
	scope: Scope;
	period: { start: number; end: number } | null;
}) => {
	const id = useId();
	const t = useT();
	const router = useRouter();
	const importTimetable = useServerFn(importTimetableFn);
	const [file, setFile] = useState<{
		name: string;
		content: string;
		format: TimetableFormat;
	} | null>(null);
	const [result, setResult] = useState<Result | null>(null);
	const [busy, setBusy] = useState(false);
	const [failed, setFailed] = useState(false);

	const run = async (apply: boolean) => {
		if (!file) return;
		setBusy(true);
		setFailed(false);
		try {
			const next = await importTimetable({
				data: {
					...scope,
					content: file.content,
					format: file.format,
					fileName: file.name,
					apply,
				},
			});
			// 取り込んだときは、表を読み直してから結果を出す（結果と表が食い違わないように）
			if (next.ok && next.applied) await router.invalidate();
			setResult(next);
		} catch (error) {
			console.error(error);
			setFailed(true);
		} finally {
			setBusy(false);
		}
	};

	const downloadTemplate = () => {
		const date = exampleDate(period);
		const text = toCsv([
			[
				t("timetable.columnTitle"),
				t("timetable.columnSpeaker"),
				t("timetable.columnRoom"),
				t("timetable.columnStart"),
				t("timetable.columnEnd"),
				"track_color",
				"tags",
			],
			[
				"Keynote",
				"Taro Yamada",
				"Hall A",
				`${date} 10:00`,
				`${date} 10:40`,
				"#6FB3AE",
				"keynote",
			],
		]);
		const url = URL.createObjectURL(new Blob([text], { type: "text/csv" }));
		const link = document.createElement("a");
		link.href = url;
		link.download = "timetable.csv";
		link.click();
		URL.revokeObjectURL(url);
	};

	const rows = result && "rows" in result && result.rows ? result.rows : [];
	const errorRows = rows.filter((row) => row.errors.length > 0);
	const time = (start: number | null, end: number | null) =>
		start !== null && end !== null
			? `${formatTime(start)}–${formatTime(end)}`
			: "—";

	return (
		<div className="space-y-3 rounded-lg border border-dashed border-line-strong p-4">
			<div className="flex flex-wrap items-baseline justify-between gap-2">
				<h2 className="text-sm font-bold text-ink">
					{t("timetable.importTitle")}
				</h2>
				<Button variant="ghost" size="sm" onClick={downloadTemplate}>
					{t("timetable.template")}
				</Button>
			</div>
			<p className="max-w-prose text-sm leading-relaxed text-ink-muted">
				{t("timetable.importDescription")}
			</p>
			<div className="flex flex-wrap items-end gap-3">
				<label htmlFor={`${id}-file`} className="flex flex-col gap-1 text-sm">
					<span className="font-bold text-ink">
						{t("timetable.chooseFile")}
					</span>
					<input
						id={`${id}-file`}
						type="file"
						accept=".csv,.json,text/csv,application/json"
						onChange={async (event) => {
							const chosen = event.target.files?.[0];
							setResult(null);
							if (!chosen) {
								setFile(null);
								return;
							}
							const content = await chosen.text();
							setFile({
								name: chosen.name,
								content,
								format: detectTimetableFormat(chosen.name, content),
							});
						}}
						className="text-sm text-ink-muted file:mr-3 file:rounded-md file:border file:border-line-strong file:bg-surface file:px-3 file:py-1 file:text-sm file:font-bold file:text-ink"
					/>
				</label>
				<Button
					variant="secondary"
					size="sm"
					disabled={!file || busy}
					onClick={() => void run(false)}
				>
					{t("timetable.check")}
				</Button>
			</div>

			{failed && <Alert tone="error">{t("common.failed")}</Alert>}
			{result && !result.ok && (
				<Alert tone="error">
					<ul>
						{result.errors.map((message) => (
							<li key={message}>{message}</li>
						))}
					</ul>
				</Alert>
			)}
			{result?.ok && result.applied && (
				<Alert tone="success">
					{t("timetable.imported", { count: result.count })}
				</Alert>
			)}
			{result?.ok && !result.applied && (
				<>
					{errorRows.length > 0 ? (
						<Alert tone="error">
							{t("timetable.hasErrors", { count: errorRows.length })}
						</Alert>
					) : (
						<div className="flex flex-wrap items-center justify-between gap-3">
							<Alert tone="success" className="flex-1">
								{t("timetable.ready", { count: rows.length })}
							</Alert>
							<Button
								variant="primary"
								disabled={busy}
								onClick={() => void run(true)}
							>
								{t("timetable.import", { count: rows.length })}
							</Button>
						</div>
					)}
				</>
			)}
			{rows.length > 0 && !(result?.ok && result.applied) && (
				<div className="max-h-96 overflow-auto rounded-md border border-line">
					<table className="w-full min-w-xl text-left text-sm">
						<thead className="sticky top-0 bg-surface-sunken text-xs text-ink-muted">
							<tr>
								<th scope="col" className="px-3 py-2 font-bold">
									#
								</th>
								<th
									scope="col"
									className="px-3 py-2 font-bold whitespace-nowrap"
								>
									{t("timetable.columnTime")}
								</th>
								<th
									scope="col"
									className="px-3 py-2 font-bold whitespace-nowrap"
								>
									{t("timetable.columnRoom")}
								</th>
								<th
									scope="col"
									className="px-3 py-2 font-bold whitespace-nowrap"
								>
									{t("timetable.columnTitle")}
								</th>
								<th
									scope="col"
									className="px-3 py-2 font-bold whitespace-nowrap"
								>
									{t("timetable.columnSpeaker")}
								</th>
							</tr>
						</thead>
						<tbody className="divide-y divide-line">
							{rows.map((row) => (
								<tr
									key={row.line}
									className={row.errors.length > 0 ? "bg-danger-soft" : ""}
								>
									<td className="px-3 py-2 align-top text-ink-muted tabular">
										{row.line}
									</td>
									<td className="px-3 py-2 align-top whitespace-nowrap tabular">
										{time(row.start, row.end)}
									</td>
									<td className="px-3 py-2 align-top">{row.room}</td>
									<td className="px-3 py-2 align-top font-bold text-ink">
										{row.title}
										{row.errors.length > 0 && (
											<ul className="mt-1 space-y-0.5 text-xs font-normal text-danger">
												{row.errors.map((message) => (
													<li key={message}>{message}</li>
												))}
											</ul>
										)}
									</td>
									<td className="px-3 py-2 align-top">{row.speaker}</td>
								</tr>
							))}
						</tbody>
					</table>
				</div>
			)}
		</div>
	);
};

export default TimetableImport;
