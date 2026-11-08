-- AlterTable
ALTER TABLE "Event" ADD COLUMN "positionsEnabled" BOOLEAN;

-- AlterTable
ALTER TABLE "Tenant" ADD COLUMN "positionsEnabled" BOOLEAN;

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Organization" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "discordGuildId" TEXT,
    "discordGuildName" TEXT,
    "discordGuildIcon" TEXT,
    "positionsEnabled" BOOLEAN NOT NULL DEFAULT true,
    "preferenceDeadline" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_Organization" ("createdAt", "discordGuildIcon", "discordGuildId", "discordGuildName", "id", "name", "preferenceDeadline", "slug", "updatedAt") SELECT "createdAt", "discordGuildIcon", "discordGuildId", "discordGuildName", "id", "name", "preferenceDeadline", "slug", "updatedAt" FROM "Organization";
DROP TABLE "Organization";
ALTER TABLE "new_Organization" RENAME TO "Organization";
CREATE UNIQUE INDEX "Organization_slug_key" ON "Organization"("slug");
CREATE TABLE "new_Shift" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "organizationId" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "eventId" TEXT,
    "staffId" TEXT NOT NULL,
    "roleId" TEXT,
    "timeRange" JSONB NOT NULL,
    "isPreferredRole" BOOLEAN NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "version" INTEGER NOT NULL DEFAULT 1,
    CONSTRAINT "Shift_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Shift_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Shift_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Shift_staffId_fkey" FOREIGN KEY ("staffId") REFERENCES "Staff" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Shift_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "Role" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Shift" ("eventId", "id", "isPreferredRole", "organizationId", "roleId", "staffId", "status", "tenantId", "timeRange", "version") SELECT "eventId", "id", "isPreferredRole", "organizationId", "roleId", "staffId", "status", "tenantId", "timeRange", "version" FROM "Shift";
DROP TABLE "Shift";
ALTER TABLE "new_Shift" RENAME TO "Shift";
CREATE INDEX "Shift_organizationId_status_idx" ON "Shift"("organizationId", "status");
CREATE INDEX "Shift_tenantId_eventId_status_idx" ON "Shift"("tenantId", "eventId", "status");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
