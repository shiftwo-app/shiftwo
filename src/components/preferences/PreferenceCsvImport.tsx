import { useRouter } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useId, useState } from "react";
import { useIntlLocale, useT } from "../../lib/i18n/react";
import { preferenceCsvTemplate } from "../../lib/preferences-csv";
import { importPreferencesFn } from "../../server/preferences.functions";
import Alert from "../ui/Alert";
import Button from "../ui/Button";
import { formatRange, splitJst } from "./time";

type Result = Awaited<ReturnType<typeof importPreferencesFn>>;

/**
 * 希望の CSV での一括登録（FR-5-J）。ファイルを選んで「確かめる」と、行ごとの問題を一覧にする。
 * 問題がなければ「登録する」で、この単位の希望をまとめて置き換える（サーバーでも確かめ直す）
 */
const PreferenceCsvImport = ({
	orgSlug,
	scope,
	example,
}: {
	orgSlug: string;
	/** ?scope= の形の単位 */
	scope: string;
	/** ひな形の例に使う、スタッフ・日付・持ち場 */
	example: { staffName: string; date: number; positionName?: string };
}) => {
	const id = useId();
	const t = useT();
	const intlLocale = useIntlLocale();
	const router = useRouter();
	const importPreferences = useServerFn(importPreferencesFn);
	const [csv, setCsv] = useState<string | null>(null);
	const [result, setResult] = useState<Result | null>(null);
	const [busy, setBusy] = useState(false);
	const [failed, setFailed] = useState(false);

	const run = async (apply: boolean) => {
		if (csv === null) return;
		setBusy(true);
		setFailed(false);
		try {
			const next = await importPreferences({
				data: { orgSlug, scope, csv, apply },
			});
			setResult(next);
			if (next.ok && next.applied) await router.invalidate();
		} catch (error) {
			console.error(error);
			setFailed(true);
		} finally {
			setBusy(false);
		}
	};

	const downloadTemplate = () => {
		const text = preferenceCsvTemplate(t, {
			staffName: example.staffName,
			date: splitJst(example.date).date,
			positionName: example.positionName,
		});
		const url = URL.createObjectURL(new Blob([text], { type: "text/csv" }));
		const link = document.createElement("a");
		link.href = url;
		link.download = "preferences.csv";
		link.click();
		URL.revokeObjectURL(url);
	};

	const rows = result?.ok ? result.rows : [];
	const errorRows = rows.filter((row) => row.errors.length > 0);

	return (
		<div className="space-y-3 rounded-lg border border-dashed border-line-strong p-4">
			<div className="flex flex-wrap items-baseline justify-between gap-2">
				<h3 className="text-sm font-bold text-ink">
					{t("preferences.csvTitle")}
				</h3>
				<Button variant="ghost" size="sm" onClick={downloadTemplate}>
					{t("preferences.csvTemplate")}
				</Button>
			</div>
			<p className="text-sm leading-relaxed text-ink-muted">
				{t("preferences.csvDescription")}
			</p>
			<div className="flex flex-wrap items-end gap-3">
				<label htmlFor={`${id}-file`} className="flex flex-col gap-1 text-sm">
					<span className="font-bold text-ink">
						{t("preferences.csvChooseFile")}
					</span>
					<input
						id={`${id}-file`}
						type="file"
						accept=".csv,text/csv"
						onChange={async (event) => {
							const file = event.target.files?.[0];
							setResult(null);
							setCsv(file ? await file.text() : null);
						}}
						className="text-sm text-ink-muted file:mr-3 file:rounded-md file:border file:border-line-strong file:bg-surface file:px-3 file:py-1 file:text-sm file:font-bold file:text-ink"
					/>
				</label>
				<Button
					variant="secondary"
					size="sm"
					disabled={csv === null || busy}
					onClick={() => void run(false)}
				>
					{t("preferences.csvCheck")}
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
					{t("preferences.csvImported", { count: result.count })}
				</Alert>
			)}
			{result?.ok && !result.applied && (
				<>
					{errorRows.length > 0 ? (
						<Alert tone="error">
							{t("preferences.csvHasErrors", { count: errorRows.length })}
						</Alert>
					) : (
						<div className="flex flex-wrap items-center justify-between gap-3">
							<Alert tone="success" className="flex-1">
								{t("preferences.csvReady", { count: rows.length })}
							</Alert>
							<Button
								variant="primary"
								disabled={busy}
								onClick={() => void run(true)}
							>
								{t("preferences.csvImport", { count: rows.length })}
							</Button>
						</div>
					)}
					<div className="overflow-x-auto rounded-md border border-line">
						<table className="w-full min-w-xl text-left text-sm">
							<thead className="bg-surface-sunken text-xs text-ink-muted">
								<tr>
									<th
										scope="col"
										className="px-3 py-2 font-bold whitespace-nowrap"
									>
										#
									</th>
									<th
										scope="col"
										className="px-3 py-2 font-bold whitespace-nowrap"
									>
										{t("preferences.csvColumnStaff")}
									</th>
									<th
										scope="col"
										className="px-3 py-2 font-bold whitespace-nowrap"
									>
										{t("preferences.csvColumnBreaks")}
									</th>
									<th
										scope="col"
										className="px-3 py-2 font-bold whitespace-nowrap"
									>
										{t("preferences.csvColumnPositions")}
									</th>
									<th
										scope="col"
										className="px-3 py-2 font-bold whitespace-nowrap"
									>
										{t("preferences.csvColumnMemo")}
									</th>
								</tr>
							</thead>
							<tbody className="divide-y divide-line">
								{rows.map((row) => (
									<tr
										key={row.line}
										className={row.errors.length > 0 ? "bg-danger-soft" : ""}
									>
										<td className="px-3 py-2 align-top tabular text-ink-muted">
											{row.line}
										</td>
										<td className="px-3 py-2 align-top font-bold text-ink">
											{row.staffName}
											{row.errors.length > 0 && (
												<ul className="mt-1 space-y-0.5 text-xs font-normal text-danger">
													{row.errors.map((message) => (
														<li key={message}>{message}</li>
													))}
												</ul>
											)}
										</td>
										<td className="px-3 py-2 align-top whitespace-nowrap tabular">
											{row.breaks
												.map((range) => formatRange(range, intlLocale))
												.join(", ")}
										</td>
										<td className="px-3 py-2 align-top">
											{row.positionNames.join(", ")}
										</td>
										<td className="px-3 py-2 align-top whitespace-pre-wrap">
											{row.memo}
										</td>
									</tr>
								))}
							</tbody>
						</table>
					</div>
				</>
			)}
		</div>
	);
};

export default PreferenceCsvImport;
