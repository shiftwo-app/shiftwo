/** シフトの単位（URL の名前）。eventSlug がなければ、そのテナントの日常シフト。画面とサーバーの両方で使う */
export type ShiftScopeParams = {
	orgSlug: string;
	tenantSlug: string;
	eventSlug?: string | null;
};
