import { useRouter } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { type FormEvent, useId, useState } from "react";
import { useIntlLocale, useT } from "../../lib/i18n/react";
import type { ShiftScopeParams } from "../../lib/shift-scope";
import {
	deleteSessionFn,
	updateSessionFn,
} from "../../server/timetable.functions";
import {
	fromDateTimeInputValue,
	toDateTimeInputValue,
} from "../timeline/datetime";
import { formatDayIn, formatTime, toMs } from "../timeline/layout";
import Alert from "../ui/Alert";
import Badge from "../ui/Badge";
import Button from "../ui/Button";
import type { Session } from "./session";

type Scope = ShiftScopeParams & { eventSlug: string };
type Message = { tone: "success" | "error"; text: string[] };

/** セッションの一覧（FR-6-A：取り込んだあとに確かめて直す）。直す・消すはイベントを管理できる人だけ */
const SessionList = ({
	sessions,
	scope,
	canManage,
}: {
	sessions: Session[];
	scope: Scope;
	canManage: boolean;
}) => {
	const t = useT();
	const intlLocale = useIntlLocale();
	const router = useRouter();
	const remove = useServerFn(deleteSessionFn);
	const [editingId, setEditingId] = useState<string | null>(null);
	const [busy, setBusy] = useState(false);
	const [message, setMessage] = useState<Message | null>(null);

	const removeSession = async (session: Session) => {
		setBusy(true);
		setMessage(null);
		try {
			const result = await remove({ data: { ...scope, id: session.id } });
			setMessage(
				result.ok
					? { tone: "success", text: [t("timetable.deleted")] }
					: { tone: "error", text: result.errors },
			);
			await router.invalidate();
		} catch (error) {
			console.error(error);
			setMessage({ tone: "error", text: [t("common.failed")] });
		} finally {
			setBusy(false);
		}
	};

	return (
		<div className="space-y-3">
			{message && (
				<Alert tone={message.tone}>
					<ul>
						{message.text.map((line) => (
							<li key={line}>{line}</li>
						))}
					</ul>
				</Alert>
			)}
			<div className="overflow-x-auto rounded-lg border border-line">
				<table className="w-full min-w-2xl text-left text-sm">
					<thead className="bg-surface-sunken text-xs text-ink-muted">
						<tr>
							<th scope="col" className="px-3 py-2 font-bold whitespace-nowrap">
								{t("timetable.columnTime")}
							</th>
							<th scope="col" className="px-3 py-2 font-bold whitespace-nowrap">
								{t("timetable.columnRoom")}
							</th>
							<th scope="col" className="px-3 py-2 font-bold whitespace-nowrap">
								{t("timetable.columnTitle")}
							</th>
							<th scope="col" className="px-3 py-2 font-bold whitespace-nowrap">
								{t("timetable.columnSpeaker")}
							</th>
							<th scope="col" className="px-3 py-2 font-bold whitespace-nowrap">
								{t("timetable.columnTags")}
							</th>
							{canManage && <th scope="col" className="px-3 py-2" />}
						</tr>
					</thead>
					<tbody className="divide-y divide-line">
						{sessions.map((session) =>
							editingId === session.id ? (
								<tr key={session.id}>
									<td colSpan={canManage ? 6 : 5} className="px-3 py-3">
										<SessionForm
											session={session}
											scope={scope}
											onDone={async (saved) => {
												setEditingId(null);
												if (saved) {
													setMessage({
														tone: "success",
														text: [t("timetable.saved")],
													});
													await router.invalidate();
												}
											}}
										/>
									</td>
								</tr>
							) : (
								<tr key={session.id}>
									<td className="px-3 py-2 align-top whitespace-nowrap tabular">
										<span className="block text-xs text-ink-muted">
											{formatDayIn(toMs(session.start), intlLocale)}
										</span>
										{formatTime(toMs(session.start))}–
										{formatTime(toMs(session.end))}
									</td>
									<td className="px-3 py-2 align-top">
										<span className="flex items-center gap-2">
											{session.trackColor && (
												<span
													aria-hidden
													className="size-2.5 shrink-0 rounded-full"
													style={{ backgroundColor: session.trackColor }}
												/>
											)}
											{session.room}
										</span>
									</td>
									<td className="px-3 py-2 align-top font-bold text-ink">
										{session.title}
									</td>
									<td className="px-3 py-2 align-top">{session.speaker}</td>
									<td className="px-3 py-2 align-top">
										<span className="flex flex-wrap gap-1">
											{session.tags.map((tag) => (
												<Badge key={tag}>{tag}</Badge>
											))}
										</span>
									</td>
									{canManage && (
										<td className="px-3 py-2 text-right align-top whitespace-nowrap">
											<Button
												variant="ghost"
												size="sm"
												disabled={busy}
												onClick={() => {
													setMessage(null);
													setEditingId(session.id);
												}}
											>
												{t("timetable.edit")}
											</Button>
											<Button
												variant="ghost"
												size="sm"
												disabled={busy}
												onClick={() => void removeSession(session)}
											>
												{t("timetable.delete")}
											</Button>
										</td>
									)}
								</tr>
							),
						)}
					</tbody>
				</table>
			</div>
		</div>
	);
};

/** 1 セッションを直すフォーム（一覧の行の中に開く） */
const SessionForm = ({
	session,
	scope,
	onDone,
}: {
	session: Session;
	scope: Scope;
	onDone: (saved: boolean) => void | Promise<void>;
}) => {
	const t = useT();
	const id = useId();
	const update = useServerFn(updateSessionFn);
	const [values, setValues] = useState({
		title: session.title,
		speaker: session.speaker,
		room: session.room,
		start: toDateTimeInputValue(toMs(session.start)),
		end: toDateTimeInputValue(toMs(session.end)),
		trackColor: session.trackColor ?? "",
		tags: session.tags.join("; "),
	});
	const [busy, setBusy] = useState(false);
	const [errors, setErrors] = useState<string[]>([]);
	const set =
		(key: keyof typeof values) => (event: { target: { value: string } }) =>
			setValues((current) => ({ ...current, [key]: event.target.value }));

	const submit = async (event: FormEvent<HTMLFormElement>) => {
		event.preventDefault();
		setBusy(true);
		setErrors([]);
		try {
			const result = await update({
				data: {
					...scope,
					id: session.id,
					session: {
						title: values.title,
						speaker: values.speaker,
						room: values.room,
						start: fromDateTimeInputValue(values.start) ?? values.start,
						end: fromDateTimeInputValue(values.end) ?? values.end,
						trackColor: values.trackColor.trim() || null,
						tags: values.tags
							.split(/[;；]/)
							.map((tag) => tag.trim())
							.filter(Boolean),
					},
				},
			});
			if (result.ok) await onDone(true);
			else setErrors(result.errors);
		} catch (error) {
			console.error(error);
			setErrors([t("common.failed")]);
		} finally {
			setBusy(false);
		}
	};

	const field = (
		key: keyof typeof values,
		label: string,
		props: { type?: string; hint?: string; required?: boolean } = {},
	) => (
		<label htmlFor={`${id}-${key}`} className="flex flex-col gap-1 text-sm">
			<span className="font-bold text-ink">
				{label}
				{props.hint && (
					<span className="ml-2 text-xs font-normal text-ink-muted">
						{props.hint}
					</span>
				)}
			</span>
			<input
				id={`${id}-${key}`}
				type={props.type ?? "text"}
				required={props.required}
				value={values[key]}
				onChange={set(key)}
				className="control w-full"
			/>
		</label>
	);

	return (
		<form onSubmit={submit} className="space-y-3">
			<div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
				{field("title", t("timetable.columnTitle"), { required: true })}
				{field("speaker", t("timetable.columnSpeaker"), { required: true })}
				{field("room", t("timetable.columnRoom"), { required: true })}
				{field("start", t("timetable.columnStart"), {
					type: "datetime-local",
					required: true,
				})}
				{field("end", t("timetable.columnEnd"), {
					type: "datetime-local",
					required: true,
				})}
				{field("trackColor", t("timetable.columnTrackColor"), {
					hint: "#RRGGBB",
				})}
				{field("tags", t("timetable.columnTags"), {
					hint: t("timetable.tagsHint"),
				})}
			</div>
			{errors.length > 0 && (
				<Alert tone="error">
					<ul>
						{errors.map((line) => (
							<li key={line}>{line}</li>
						))}
					</ul>
				</Alert>
			)}
			<div className="flex justify-end gap-2">
				<Button
					variant="ghost"
					disabled={busy}
					onClick={() => void onDone(false)}
				>
					{t("timetable.cancel")}
				</Button>
				<Button type="submit" variant="primary" disabled={busy}>
					{t("timetable.save")}
				</Button>
			</div>
		</form>
	);
};

export default SessionList;
