import { describe, expect, it } from "vite-plus/test";
import { detectAvatarImageType } from "./avatar-image";

const bytes = (...values: number[]) => new Uint8Array(values);
const ascii = (text: string) => Array.from(new TextEncoder().encode(text));

describe("detectAvatarImageType", () => {
	it("PNG・JPEG・WebP を先頭のバイトで見分ける", () => {
		expect(
			detectAvatarImageType(
				bytes(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0),
			),
		).toEqual({ contentType: "image/png", ext: "png" });
		expect(detectAvatarImageType(bytes(0xff, 0xd8, 0xff, 0xe0))).toEqual({
			contentType: "image/jpeg",
			ext: "jpg",
		});
		expect(
			detectAvatarImageType(
				bytes(...ascii("RIFF"), 0, 0, 0, 0, ...ascii("WEBPVP8 ")),
			),
		).toEqual({ contentType: "image/webp", ext: "webp" });
	});

	it("SVG・HTML・ほかの RIFF（WAV など）・空は受け付けない", () => {
		for (const input of [
			bytes(...ascii('<svg xmlns="http://www.w3.org/2000/svg">')),
			bytes(...ascii("<!doctype html>")),
			bytes(...ascii("RIFF"), 0, 0, 0, 0, ...ascii("WAVEfmt ")),
			bytes(),
		]) {
			expect(detectAvatarImageType(input)).toBeNull();
		}
	});
});
