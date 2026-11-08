-- 権限の項目「ゲストを招待する」（invite.guest）を足す。データだけの変更で、スキーマは変えない。
-- 既存の団体の最初のロール（前のマイグレーションで作った、マネージャーとリーダー）に、まだなければ足す。
-- 団体ごとに編集したロールや、あとから作ったロールには触れない
UPDATE "OrgRole"
SET "permissions" = "permissions" || '["invite.guest"]'::jsonb
WHERE ("id" LIKE 'role-%-manager' OR "id" LIKE 'role-%-leader')
  AND NOT ("permissions" @> '["invite.guest"]'::jsonb);
