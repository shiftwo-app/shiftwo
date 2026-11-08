// MCP のクライアント（AI のアシスタントのアプリ）の、同意の画面とアカウントの設定で使う DB の読み書き
import { verifyOAuthQueryParams } from "@better-auth/oauth-provider";
import { auth } from "../lib/auth.server";
import { MCP_SCOPE_READ, MCP_SCOPE_WRITE } from "../lib/mcp-config";
import { prisma } from "../lib/prisma.server";

/** DB の文字列の配列（Postgres は配列、SQLite は JSON の文字列）を読む */
export const readStringList = (value: unknown): string[] => {
	if (Array.isArray(value)) return value.map(String);
	if (typeof value === "string") {
		try {
			const parsed: unknown = JSON.parse(value);
			return Array.isArray(parsed) ? parsed.map(String) : [];
		} catch {
			return [];
		}
	}
	return [];
};

const hostOf = (value: string | null | undefined): string | null => {
	if (!value) return null;
	try {
		return new URL(value).host || new URL(value).protocol.replace(/:$/, "");
	} catch {
		return null;
	}
};

export type ConsentRequest = {
	clientId: string;
	clientName: string;
	clientHost: string | null;
	/** 認可のあとに戻る先（ほかのアプリを名乗った偽物を見分ける手がかりとして見せる） */
	redirectHost: string | null;
	/** 求められたシフトヲの権限 */
	wantsRead: boolean;
	wantsWrite: boolean;
	/** 求められたスコープ（同意するときに、そのまま、または書く権限を外して返す） */
	scopes: string[];
};

/**
 * 同意の画面のクエリ（Better Auth が署名したもの）を確かめて、どのアプリが何を求めているかを返す。
 * 署名が合わない・期限切れ・アプリがない（止められている）なら null
 */
export const readConsentRequest = async (
	oauthQuery: string,
): Promise<ConsentRequest | null> => {
	const { secret } = await auth.$context;
	if (!(await verifyOAuthQueryParams(oauthQuery, secret))) return null;
	const params = new URLSearchParams(oauthQuery);
	const clientId = params.get("client_id");
	if (!clientId) return null;
	const client = await prisma.oauthClient.findUnique({
		where: { clientId },
		select: { name: true, uri: true, disabled: true },
	});
	if (!client || client.disabled) return null;
	const scopes = (params.get("scope") ?? "").split(" ").filter(Boolean);
	return {
		clientId,
		clientName: client.name?.trim() || clientId,
		clientHost: hostOf(client.uri),
		redirectHost: hostOf(params.get("redirect_uri")),
		wantsRead: scopes.includes(MCP_SCOPE_READ),
		wantsWrite: scopes.includes(MCP_SCOPE_WRITE),
		scopes,
	};
};

export type ConnectedApp = {
	clientId: string;
	name: string;
	host: string | null;
	canWrite: boolean;
	connectedAt: Date | null;
};

/** 本人がつないだアプリ（同意したもの） */
export const listConnectedApps = async (
	userId: string,
): Promise<ConnectedApp[]> => {
	const consents = await prisma.oauthConsent.findMany({
		where: { userId },
		select: {
			clientId: true,
			scopes: true,
			createdAt: true,
			client: { select: { name: true, uri: true } },
		},
		orderBy: { createdAt: "desc" },
	});
	return consents.map((consent) => ({
		clientId: consent.clientId,
		name: consent.client.name?.trim() || consent.clientId,
		host: hostOf(consent.client.uri),
		canWrite: readStringList(consent.scopes).includes(MCP_SCOPE_WRITE),
		connectedAt: consent.createdAt,
	}));
};

/**
 * アプリとのつながりを切る：同意と、そのアプリに出したトークンをまとめて消す。
 * アクセストークン（JWT）は期限まで署名が有効なままなので、/api/mcp は同意が残っているかも毎回確かめる
 */
export const disconnectApp = async (userId: string, clientId: string) => {
	await prisma.$transaction([
		prisma.oauthAccessToken.deleteMany({ where: { userId, clientId } }),
		prisma.oauthRefreshToken.deleteMany({ where: { userId, clientId } }),
		prisma.oauthConsent.deleteMany({ where: { userId, clientId } }),
	]);
};

/** このアプリに、この人の同意が今も残っているか（アプリが止められていないか） */
export const hasActiveConsent = async (userId: string, clientId: string) => {
	const consent = await prisma.oauthConsent.findFirst({
		// disabled は NULL のこともある（SQL の <> true は NULL を外してしまうので、OR で書く）
		where: {
			userId,
			clientId,
			client: { OR: [{ disabled: false }, { disabled: null }] },
		},
		select: { id: true },
	});
	return consent !== null;
};
