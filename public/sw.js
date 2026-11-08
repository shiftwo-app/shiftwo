// シフトヲの Service Worker（FR-3-5）。ホーム画面に追加できるようにするためのもので、オフラインでの利用には対応しない。
// データ（/api/*）や画面は保存せず、いつもネットワークから読む。つながらないときだけ、画面の代わりに案内を出す
const OFFLINE_HTML = `<!doctype html><html lang="ja"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1"><title>シフトヲ</title>
<style>body{margin:0;min-height:100dvh;display:grid;place-items:center;font-family:system-ui,sans-serif;background:#f5f8f7;color:#2a3541;padding:16px;text-align:center}@media (prefers-color-scheme:dark){body{background:#141c25;color:#dde5eb}}</style>
</head><body><main><h1 style="font-size:1.25rem">インターネットにつながっていません</h1>
<p>つながったら、もう一度開いてください。 / You are offline. Please try again when you are back online.</p></main></body></html>`;

self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) =>
	event.waitUntil(self.clients.claim()),
);

self.addEventListener("fetch", (event) => {
	// 画面の読み込みだけを見る（API や画像などは、ブラウザにそのまま任せる）
	if (event.request.mode !== "navigate") return;
	event.respondWith(
		fetch(event.request).catch(
			() =>
				new Response(OFFLINE_HTML, {
					status: 503,
					headers: { "Content-Type": "text/html; charset=utf-8" },
				}),
		),
	);
});
