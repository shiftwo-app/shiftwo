-- 団体（Organization）・所属（Member）・招待コード（Invite）を足し、既存のテーブルに organizationId を持たせる。
-- prisma migrate diff の出力を、既存のデータがある DB でも通るように並べ替えた（列は空を許して足し、埋めてから必須にする）

-- CreateEnum
CREATE TYPE "MemberRole" AS ENUM ('owner', 'leader', 'staff', 'guest');

-- CreateTable
CREATE TABLE "Organization" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Organization_pkey" PRIMARY KEY ("id")
);

-- 既存のデータを団体に入れる。
-- 団体ができる前のデータ（スタッフ・役割・イベント・シフト・設定）がある DB では、「既存のデータ」の団体を 1 つ作って
-- そこへ移す。オーナーはまだいないので、運営者が DB でメンバーを足すか、作り直してください。データがなければ何もしない
ALTER TABLE "Event" ADD COLUMN "organizationId" TEXT;
ALTER TABLE "Role" ADD COLUMN "organizationId" TEXT;
ALTER TABLE "Shift" ADD COLUMN "organizationId" TEXT;
ALTER TABLE "ShiftSetting" ADD COLUMN "organizationId" TEXT;
ALTER TABLE "Staff" ADD COLUMN "organizationId" TEXT;

INSERT INTO "Organization" ("id", "slug", "name", "createdAt", "updatedAt")
SELECT 'legacy-organization', 'legacy', '既存のデータ', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE EXISTS (SELECT 1 FROM "Staff") OR EXISTS (SELECT 1 FROM "Role") OR EXISTS (SELECT 1 FROM "Event")
   OR EXISTS (SELECT 1 FROM "Shift") OR EXISTS (SELECT 1 FROM "ShiftSetting");

UPDATE "Event" SET "organizationId" = 'legacy-organization' WHERE "organizationId" IS NULL;
UPDATE "Role" SET "organizationId" = 'legacy-organization' WHERE "organizationId" IS NULL;
UPDATE "Shift" SET "organizationId" = 'legacy-organization' WHERE "organizationId" IS NULL;
UPDATE "ShiftSetting" SET "organizationId" = 'legacy-organization' WHERE "organizationId" IS NULL;
UPDATE "Staff" SET "organizationId" = 'legacy-organization' WHERE "organizationId" IS NULL;

-- 団体ごとに設定は 1 つなので、既存の設定が複数あれば最初の 1 つだけ残す
DELETE FROM "ShiftSetting" WHERE "id" NOT IN (SELECT "id" FROM "ShiftSetting" ORDER BY "id" LIMIT 1);

ALTER TABLE "Event" ALTER COLUMN "organizationId" SET NOT NULL;
ALTER TABLE "Role" ALTER COLUMN "organizationId" SET NOT NULL;
ALTER TABLE "Shift" ALTER COLUMN "organizationId" SET NOT NULL;
ALTER TABLE "ShiftSetting" ALTER COLUMN "organizationId" SET NOT NULL;
ALTER TABLE "Staff" ALTER COLUMN "organizationId" SET NOT NULL;

-- CreateTable
CREATE TABLE "Member" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" "MemberRole" NOT NULL,
    "displayName" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Member_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Invite" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "role" "MemberRole" NOT NULL,
    "maxUses" INTEGER,
    "uses" INTEGER NOT NULL DEFAULT 0,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "revokedAt" TIMESTAMP(3),
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Invite_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Organization_slug_key" ON "Organization"("slug");

-- CreateIndex
CREATE INDEX "Member_userId_idx" ON "Member"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Member_organizationId_userId_key" ON "Member"("organizationId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "Invite_code_key" ON "Invite"("code");

-- CreateIndex
CREATE INDEX "Invite_organizationId_idx" ON "Invite"("organizationId");

-- CreateIndex
CREATE INDEX "Event_organizationId_idx" ON "Event"("organizationId");

-- CreateIndex
CREATE INDEX "Role_organizationId_idx" ON "Role"("organizationId");

-- CreateIndex
CREATE INDEX "Shift_organizationId_status_idx" ON "Shift"("organizationId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "ShiftSetting_organizationId_key" ON "ShiftSetting"("organizationId");

-- CreateIndex
CREATE INDEX "Staff_organizationId_idx" ON "Staff"("organizationId");

-- AddForeignKey
ALTER TABLE "Staff" ADD CONSTRAINT "Staff_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Role" ADD CONSTRAINT "Role_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Event" ADD CONSTRAINT "Event_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Shift" ADD CONSTRAINT "Shift_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShiftSetting" ADD CONSTRAINT "ShiftSetting_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Member" ADD CONSTRAINT "Member_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Member" ADD CONSTRAINT "Member_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invite" ADD CONSTRAINT "Invite_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invite" ADD CONSTRAINT "Invite_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

