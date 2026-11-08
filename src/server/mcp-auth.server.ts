// MCP（/api/mcp）のアクセストークンを確かめる。
// @better-auth/mcp の requireMcpAuth は、署名の鍵（JWKS）を自分の /api/auth/jwks に HTTP で取りに行く。
// Cloudflare Workers は自分のドメインへの fetch が失敗する（522）ので、ここでは同じプロセスの中で鍵を読んで確かめる。
// 受け付けるのは Bearer トークンだけ（DPoP で送り手に縛ったトークンは、確かめる手段がないので断る）
import { createResourceServerChallenge } from "@better-auth/oauth-provider";
import { APIError } from "better-auth/api";
import { verifyJwsAccessToken } from "better-auth/oauth2";
import {
	errors as joseErrors,
	type JSONWebKeySet,
	type JWTPayload,
} from "jose";
import { auth } from "../lib/auth.server";
import { MCP_SCOPE_READ, mcpResourceUrl } from "../lib/mcp-config";
import { findActiveConsentScopes } from "./oauth-apps.server";

/** 確かめたトークンの持ち主と、許された範囲 */
export type McpPrincipal = {
	userId: string;
	clientId: string;
	scopes: Set<string>;
	token: string;
	expiresAt?: number;
};

// 鍵の一覧のキャッシュの目印（verifyJwsAccessToken が、これをキーに鍵を一定時間とっておく）
const jwksCacheKey = {};

const loadJwks = async (): Promise<JSONWebKeySet> =>
	(await auth.api.getJwks()) as JSONWebKeySet;

const unauthorized = (message: string) =>
	new APIError("UNAUTHORIZED", { message });

/** トークンを確かめる。だめなら APIError（UNAUTHORIZED）を投げる */
const verify = async (request: Request): Promise<McpPrincipal> => {
	const header = request.headers.get("authorization");
	const [scheme, token, ...rest] = header?.trim().split(/\s+/) ?? [];
	if (!scheme || !token || rest.length > 0) {
		throw unauthorized("missing authorization header");
	}
	if (scheme.toLowerCase() !== "bearer") {
		throw unauthorized("authorization scheme must be Bearer");
	}
	const { baseURL } = await auth.$context;
	let payload: JWTPayload;
	try {
		payload = await verifyJwsAccessToken(token, {
			jwksFetch: loadJwks,
			jwksCacheKey,
			verifyOptions: {
				issuer: baseURL,
				audience: mcpResourceUrl(process.env.BETTER_AUTH_URL),
				requiredClaims: ["azp", "sub"],
			},
		});
	} catch (error) {
		if (error instanceof joseErrors.JWTExpired) {
			throw unauthorized("token expired");
		}
		if (error instanceof joseErrors.JOSEError || error instanceof TypeError) {
			throw unauthorized("invalid access token");
		}
		throw error;
	}
	// DPoP で縛ったトークン（cnf.jkt）は、送り手の証明を確かめられないので受け付けない
	const confirmation = payload.cnf as { jkt?: unknown } | undefined;
	if (confirmation?.jkt)
		throw unauthorized("DPoP-bound tokens are not supported");
	const userId = String(payload.sub);
	const clientId = String(payload.azp);
	// アカウントの設定でつながりを切った（同意を消した）アプリのトークンは、期限の前でも受け付けない
	const consented = await findActiveConsentScopes(userId, clientId);
	if (!consented) throw unauthorized("the user has disconnected this app");
	// 認めるのは、トークンのスコープと、今の同意のスコープの重なりだけ
	// （つなぎ直して「見るだけ」にしたあと、前の書けるトークンで書けないように）
	const tokenScopes =
		typeof payload.scope === "string" ? payload.scope.split(" ") : [];
	const scopes = new Set(
		tokenScopes.filter((scope) => consented.includes(scope)),
	);
	if (!scopes.has(MCP_SCOPE_READ)) {
		throw unauthorized("token does not grant shiftwo:read");
	}
	return {
		userId,
		clientId,
		scopes,
		token,
		expiresAt: payload.exp,
	};
};

/**
 * MCP の route の handler を包む。トークンがなければ・だめなら 401 と、
 * 認可の始め方（RFC 9728 の resource_metadata）を WWW-Authenticate で返す
 */
export const withMcpAuth =
	(handler: (request: Request, principal: McpPrincipal) => Promise<Response>) =>
	async (request: Request): Promise<Response> => {
		let principal: McpPrincipal;
		try {
			principal = await verify(request);
		} catch (error) {
			const resource = mcpResourceUrl(process.env.BETTER_AUTH_URL);
			const challenge = createResourceServerChallenge(error, resource, {
				challengeScopes: [MCP_SCOPE_READ],
			});
			if (!challenge) throw error;
			const headers = new Headers(challenge.headers);
			headers.set("Content-Type", "application/json");
			return new Response(
				JSON.stringify({
					jsonrpc: "2.0",
					error: { code: -32000, message: challenge.message },
					id: null,
				}),
				{ status: challenge.statusCode, headers },
			);
		}
		return handler(request, principal);
	};
