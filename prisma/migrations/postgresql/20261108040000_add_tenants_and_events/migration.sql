-- テナント（店舗にあたる単位）とイベントの階層を足す。シフトは必ずテナントに属し、イベントに紐づかないものは日常シフト。
-- prisma migrate diff の出力を、既存のデータがある DB でも通るように並べ替えた:
--   1. 新しいテーブルを作る
--   2. 団体ごとに既定のテナント（slug: main、名前は団体名、時間粒度は ShiftSetting の値、なければ 15 分）を 1 つ作る
--   3. 既存のイベント・役割・シフトをそのテナントに移す（既存の役割とシフトは日常シフトのものになる）
--   4. 時間粒度はテナント（とイベントの上書き）に移ったので、ShiftSetting を消す

-- CreateTable
CREATE TABLE "Tenant" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "timeUnitMinutes" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Tenant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TenantMember" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "role" "MemberRole" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TenantMember_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EventMember" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "role" "MemberRole" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EventMember_pkey" PRIMARY KEY ("id")
);

-- 団体ごとに既定のテナントを作る（id は団体の id から決めるので、何度流しても同じになる）
INSERT INTO "Tenant" ("id", "organizationId", "slug", "name", "timeUnitMinutes", "createdAt", "updatedAt")
SELECT 'tenant-' || o."id", o."id", 'main', o."name",
       COALESCE((SELECT s."timeUnitMinutes" FROM "ShiftSetting" s WHERE s."organizationId" = o."id"), 15),
       CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM "Organization" o;

-- 既存のイベントを既定のテナントに移す（URL 名は id の先頭から作る）
ALTER TABLE "Event" ADD COLUMN "tenantId" TEXT;
ALTER TABLE "Event" ADD COLUMN "slug" TEXT;
ALTER TABLE "Event" ADD COLUMN "timeUnitMinutes" INTEGER;
UPDATE "Event" SET "tenantId" = 'tenant-' || "organizationId", "slug" = 'event-' || substr("id", 1, 8);
ALTER TABLE "Event" ALTER COLUMN "tenantId" SET NOT NULL;
ALTER TABLE "Event" ALTER COLUMN "slug" SET NOT NULL;

-- 既存の役割は、既定のテナントの日常シフトの役割にする
ALTER TABLE "Role" ADD COLUMN "tenantId" TEXT;
ALTER TABLE "Role" ADD COLUMN "eventId" TEXT;
UPDATE "Role" SET "tenantId" = 'tenant-' || "organizationId";
ALTER TABLE "Role" ALTER COLUMN "tenantId" SET NOT NULL;

-- 既存のシフトは、既定のテナントの日常シフトにする
ALTER TABLE "Shift" ADD COLUMN "tenantId" TEXT;
ALTER TABLE "Shift" ADD COLUMN "eventId" TEXT;
UPDATE "Shift" SET "tenantId" = 'tenant-' || "organizationId";
ALTER TABLE "Shift" ALTER COLUMN "tenantId" SET NOT NULL;

-- 時間粒度はテナントに移したので、ShiftSetting を消す
ALTER TABLE "ShiftSetting" DROP CONSTRAINT "ShiftSetting_organizationId_fkey";
DROP TABLE "ShiftSetting";

-- CreateIndex
CREATE UNIQUE INDEX "Tenant_organizationId_slug_key" ON "Tenant"("organizationId", "slug");

-- CreateIndex
CREATE INDEX "TenantMember_memberId_idx" ON "TenantMember"("memberId");

-- CreateIndex
CREATE UNIQUE INDEX "TenantMember_tenantId_memberId_key" ON "TenantMember"("tenantId", "memberId");

-- CreateIndex
CREATE INDEX "EventMember_memberId_idx" ON "EventMember"("memberId");

-- CreateIndex
CREATE UNIQUE INDEX "EventMember_eventId_memberId_key" ON "EventMember"("eventId", "memberId");

-- CreateIndex
CREATE UNIQUE INDEX "Event_tenantId_slug_key" ON "Event"("tenantId", "slug");

-- CreateIndex
CREATE INDEX "Role_tenantId_eventId_idx" ON "Role"("tenantId", "eventId");

-- CreateIndex
CREATE INDEX "Shift_tenantId_eventId_status_idx" ON "Shift"("tenantId", "eventId", "status");

-- AddForeignKey
ALTER TABLE "Role" ADD CONSTRAINT "Role_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Role" ADD CONSTRAINT "Role_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Event" ADD CONSTRAINT "Event_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Shift" ADD CONSTRAINT "Shift_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Shift" ADD CONSTRAINT "Shift_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Tenant" ADD CONSTRAINT "Tenant_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TenantMember" ADD CONSTRAINT "TenantMember_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TenantMember" ADD CONSTRAINT "TenantMember_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "Member"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventMember" ADD CONSTRAINT "EventMember_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventMember" ADD CONSTRAINT "EventMember_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "Member"("id") ON DELETE CASCADE ON UPDATE CASCADE;
