/*
  Warnings:

  - You are about to drop the column `role` on the `EventMember` table. All the data in the column will be lost.
  - You are about to drop the column `role` on the `Invite` table. All the data in the column will be lost.
  - You are about to drop the column `role` on the `Member` table. All the data in the column will be lost.
  - You are about to drop the column `role` on the `TenantMember` table. All the data in the column will be lost.
  - Added the required column `roleId` to the `EventMember` table without a default value. This is not possible if the table is not empty.
  - Added the required column `roleId` to the `Invite` table without a default value. This is not possible if the table is not empty.
  - Added the required column `roleId` to the `TenantMember` table without a default value. This is not possible if the table is not empty.

*/
-- CreateTable
CREATE TABLE "OrgRole" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "organizationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "color" TEXT NOT NULL,
    "permissions" JSONB NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "OrgRole_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "MemberRoleAssignment" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "memberId" TEXT NOT NULL,
    "roleId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "MemberRoleAssignment_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "Member" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "MemberRoleAssignment_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "OrgRole" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_EventMember" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "eventId" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "roleId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "EventMember_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "EventMember_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "Member" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "EventMember_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "OrgRole" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_EventMember" ("createdAt", "eventId", "id", "memberId") SELECT "createdAt", "eventId", "id", "memberId" FROM "EventMember";
DROP TABLE "EventMember";
ALTER TABLE "new_EventMember" RENAME TO "EventMember";
CREATE INDEX "EventMember_memberId_idx" ON "EventMember"("memberId");
CREATE UNIQUE INDEX "EventMember_eventId_memberId_roleId_key" ON "EventMember"("eventId", "memberId", "roleId");
CREATE TABLE "new_Invite" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "organizationId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "roleId" TEXT NOT NULL,
    "maxUses" INTEGER,
    "uses" INTEGER NOT NULL DEFAULT 0,
    "expiresAt" DATETIME NOT NULL,
    "revokedAt" DATETIME,
    "createdById" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Invite_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Invite_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "OrgRole" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Invite_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "user" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Invite" ("code", "createdAt", "createdById", "expiresAt", "id", "maxUses", "organizationId", "revokedAt", "uses") SELECT "code", "createdAt", "createdById", "expiresAt", "id", "maxUses", "organizationId", "revokedAt", "uses" FROM "Invite";
DROP TABLE "Invite";
ALTER TABLE "new_Invite" RENAME TO "Invite";
CREATE UNIQUE INDEX "Invite_code_key" ON "Invite"("code");
CREATE INDEX "Invite_organizationId_idx" ON "Invite"("organizationId");
CREATE TABLE "new_Member" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "organizationId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "isOwner" BOOLEAN NOT NULL DEFAULT false,
    "displayName" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Member_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Member_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Member" ("createdAt", "displayName", "id", "organizationId", "updatedAt", "userId") SELECT "createdAt", "displayName", "id", "organizationId", "updatedAt", "userId" FROM "Member";
DROP TABLE "Member";
ALTER TABLE "new_Member" RENAME TO "Member";
CREATE INDEX "Member_userId_idx" ON "Member"("userId");
CREATE UNIQUE INDEX "Member_organizationId_userId_key" ON "Member"("organizationId", "userId");
CREATE TABLE "new_TenantMember" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tenantId" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "roleId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "TenantMember_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "TenantMember_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "Member" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "TenantMember_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "OrgRole" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_TenantMember" ("createdAt", "id", "memberId", "tenantId") SELECT "createdAt", "id", "memberId", "tenantId" FROM "TenantMember";
DROP TABLE "TenantMember";
ALTER TABLE "new_TenantMember" RENAME TO "TenantMember";
CREATE INDEX "TenantMember_memberId_idx" ON "TenantMember"("memberId");
CREATE UNIQUE INDEX "TenantMember_tenantId_memberId_roleId_key" ON "TenantMember"("tenantId", "memberId", "roleId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE INDEX "OrgRole_organizationId_idx" ON "OrgRole"("organizationId");

-- CreateIndex
CREATE INDEX "MemberRoleAssignment_roleId_idx" ON "MemberRoleAssignment"("roleId");

-- CreateIndex
CREATE UNIQUE INDEX "MemberRoleAssignment_memberId_roleId_key" ON "MemberRoleAssignment"("memberId", "roleId");
