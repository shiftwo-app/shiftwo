import { useEffect, useRef, useState } from "react";
import type { RealtimeTransport } from "../lib/realtime/types";
import {
	parseShiftBoardEvent,
	type ShiftBoardEvent,
	shiftBoardLivePath,
} from "../lib/shift-board-live";
import type { ShiftScopeParams } from "../lib/shift-scope";

export type LiveStatus = "connecting" | "live" | "offline";

/** つなぎ直すまでの待ち時間（失敗が続くほど長く、最大 30 秒） */
const retryDelay = (attempt: number) => Math.min(30_000, 1000 * 2 ** attempt);
/** WebSocket がつながっているかを確かめる間隔（サーバーは ping に pong を返す） */
const PING_MS = 25_000;

/**
 * シフトの単位の変更を受け取る（同時編集）。変更が届いたら onChange(event) を、
 * つなぎ直したとき（そのあいだの変更を取りこぼしたかもしれない）は onChange(null) を呼ぶ
 */
export const useShiftBoardLive = (
	scope: ShiftScopeParams,
	transport: RealtimeTransport,
	onChange: (event: ShiftBoardEvent | null) => void,
): LiveStatus => {
	const [status, setStatus] = useState<LiveStatus>("connecting");
	// onChange が変わるたびにつなぎ直さないよう、最新のものを ref で持つ
	const onChangeRef = useRef(onChange);
	onChangeRef.current = onChange;
	const path = shiftBoardLivePath(scope);

	useEffect(() => {
		let closed = false;
		let connectedBefore = false;
		const opened = () => {
			setStatus("live");
			if (connectedBefore) onChangeRef.current(null);
			connectedBefore = true;
		};
		const received = (data: unknown) => {
			const event = parseShiftBoardEvent(data);
			if (event) onChangeRef.current(event);
		};

		if (transport === "sse") {
			// EventSource は切れても自分でつなぎ直す
			const source = new EventSource(path);
			source.onopen = opened;
			source.onmessage = (message) => received(message.data);
			source.onerror = () => {
				if (!closed) setStatus("offline");
			};
			return () => {
				closed = true;
				source.close();
			};
		}

		let socket: WebSocket | undefined;
		let attempt = 0;
		let retryTimer: ReturnType<typeof setTimeout> | undefined;
		let pingTimer: ReturnType<typeof setInterval> | undefined;
		const connect = () => {
			const url = new URL(path, window.location.href);
			url.protocol = url.protocol === "https:" ? "wss:" : "ws:";
			socket = new WebSocket(url);
			socket.onopen = () => {
				attempt = 0;
				opened();
				pingTimer = setInterval(() => socket?.send("ping"), PING_MS);
			};
			socket.onmessage = (message) => {
				if (message.data !== "pong") received(message.data);
			};
			socket.onclose = () => {
				clearInterval(pingTimer);
				if (closed) return;
				setStatus("offline");
				retryTimer = setTimeout(connect, retryDelay(attempt++));
			};
		};
		connect();
		return () => {
			closed = true;
			clearTimeout(retryTimer);
			clearInterval(pingTimer);
			socket?.close();
		};
	}, [path, transport]);

	return status;
};
