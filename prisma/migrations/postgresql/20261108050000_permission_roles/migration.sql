-- 権限を Discord のような「ロール」にする。ロールごとに権限の項目を持ち、1 人が複数のロールを持てる（権限は足し合わせ）。
-- 既存のデータは次のように移す:
--   - 団体ごとに最初のロール（マネージャー・リーダー・スタッフ・ゲスト）を作る（id は団体の id から決める）
--   - メンバー：owner は isOwner に、leader・staff・guest は同じ名前のロールを付ける
--   - テナント・イベントでの割り当てと招待コード：leader・staff・guest は同じ名前のロールに、owner はマネージャーに
--   - そのあと、古い役割の列と MemberRole の型を消す

-- CreateTable
CREATE TABLE "OrgRole" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "color" TEXT NOT NULL,
    "permissions" JSONB NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OrgRole_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MemberRoleAssignment" (
    "id" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "roleId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MemberRoleAssignment_pkey" PRIMARY KEY ("id")
);

-- 団体ごとに最初のロールを作る
INSERT INTO "OrgRole" ("id", "organizationId", "name", "color", "permissions", "sortOrder", "createdAt", "updatedAt")
SELECT 'role-' || o."id" || '-manager', o."id", 'マネージャー', '#7C3AED', '["shift.view", "shift.edit", "shift.confirm", "position.manage", "event.manage", "staff.manage", "member.view", "invite.manage", "member.manage", "role.manage", "tenant.manage", "org.settings"]'::jsonb, 0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP FROM "Organization" o
UNION ALL
SELECT 'role-' || o."id" || '-leader', o."id", 'リーダー', '#2563EB', '["shift.view", "shift.edit", "shift.confirm", "position.manage", "event.manage", "staff.manage", "member.view", "invite.manage"]'::jsonb, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP FROM "Organization" o
UNION ALL
SELECT 'role-' || o."id" || '-staff', o."id", 'スタッフ', '#059669', '["shift.view", "member.view"]'::jsonb, 2, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP FROM "Organization" o
UNION ALL
SELECT 'role-' || o."id" || '-guest', o."id", 'ゲスト', '#6B7280', '["shift.view", "member.view", "guild.bypass"]'::jsonb, 3, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP FROM "Organization" o;

-- メンバー：owner は isOwner に、それ以外は同じ名前のロールを付ける
ALTER TABLE "Member" ADD COLUMN "isOwner" BOOLEAN NOT NULL DEFAULT false;
UPDATE "Member" SET "isOwner" = true WHERE "role" = 'owner';
INSERT INTO "MemberRoleAssignment" ("id", "memberId", "roleId", "createdAt")
SELECT 'assign-' || m."id", m."id", 'role-' || m."organizationId" || '-' || m."role"::text, CURRENT_TIMESTAMP
FROM "Member" m WHERE m."role" <> 'owner';

-- テナントでの割り当てを、同じ名前のロールに移す（owner はマネージャー）
DROP INDEX "TenantMember_tenantId_memberId_key";
ALTER TABLE "TenantMember" ADD COLUMN "roleId" TEXT;
UPDATE "TenantMember" tm SET "roleId" = 'role-' || t."organizationId" || '-' || CASE tm."role" WHEN 'owner' THEN 'manager' ELSE tm."role"::text END
FROM "Tenant" t WHERE t."id" = tm."tenantId";
ALTER TABLE "TenantMember" ALTER COLUMN "roleId" SET NOT NULL;

-- イベントでの割り当てを、同じ名前のロールに移す（owner はマネージャー）
DROP INDEX "EventMember_eventId_memberId_key";
ALTER TABLE "EventMember" ADD COLUMN "roleId" TEXT;
UPDATE "EventMember" em SET "roleId" = 'role-' || e."organizationId" || '-' || CASE em."role" WHEN 'owner' THEN 'manager' ELSE em."role"::text END
FROM "Event" e WHERE e."id" = em."eventId";
ALTER TABLE "EventMember" ALTER COLUMN "roleId" SET NOT NULL;

-- 招待コードを、同じ名前のロールに移す（owner はマネージャー）
ALTER TABLE "Invite" ADD COLUMN "roleId" TEXT;
UPDATE "Invite" i SET "roleId" = 'role-' || i."organizationId" || '-' || CASE i."role" WHEN 'owner' THEN 'manager' ELSE i."role"::text END;
ALTER TABLE "Invite" ALTER COLUMN "roleId" SET NOT NULL;

-- 古い役割の列と型を消す
ALTER TABLE "Member" DROP COLUMN "role";
ALTER TABLE "TenantMember" DROP COLUMN "role";
ALTER TABLE "EventMember" DROP COLUMN "role";
ALTER TABLE "Invite" DROP COLUMN "role";
DROP TYPE "MemberRole";

-- CreateIndex
CREATE INDEX "OrgRole_organizationId_idx" ON "OrgRole"("organizationId");

-- CreateIndex
CREATE INDEX "MemberRoleAssignment_roleId_idx" ON "MemberRoleAssignment"("roleId");

-- CreateIndex
CREATE UNIQUE INDEX "MemberRoleAssignment_memberId_roleId_key" ON "MemberRoleAssignment"("memberId", "roleId");

-- CreateIndex
CREATE UNIQUE INDEX "EventMember_eventId_memberId_roleId_key" ON "EventMember"("eventId", "memberId", "roleId");

-- CreateIndex
CREATE UNIQUE INDEX "TenantMember_tenantId_memberId_roleId_key" ON "TenantMember"("tenantId", "memberId", "roleId");

-- AddForeignKey
ALTER TABLE "TenantMember" ADD CONSTRAINT "TenantMember_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "OrgRole"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventMember" ADD CONSTRAINT "EventMember_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "OrgRole"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrgRole" ADD CONSTRAINT "OrgRole_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MemberRoleAssignment" ADD CONSTRAINT "MemberRoleAssignment_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "Member"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MemberRoleAssignment" ADD CONSTRAINT "MemberRoleAssignment_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "OrgRole"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invite" ADD CONSTRAINT "Invite_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "OrgRole"("id") ON DELETE CASCADE ON UPDATE CASCADE;
