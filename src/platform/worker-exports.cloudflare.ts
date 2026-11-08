// Workers の入口（src/server.ts）から出すもの。Durable Object のクラスは入口から export する決まり。
// CLOUDFLARE=1 の build でだけ、vite.config.ts の alias で "#worker-exports" をこのファイルに向ける
export { ShiftBoardRoom } from "./cloudflare-realtime.server";
