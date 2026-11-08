-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Role" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "organizationId" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "eventId" TEXT,
    "name" TEXT NOT NULL,
    "color" TEXT NOT NULL,
    "requiredStaffCount" INTEGER NOT NULL,
    "staffingRules" JSONB NOT NULL DEFAULT '[]',
    "isBreak" BOOLEAN NOT NULL DEFAULT false,
    CONSTRAINT "Role_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Role_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Role_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Role" ("color", "eventId", "id", "isBreak", "name", "organizationId", "requiredStaffCount", "tenantId") SELECT "color", "eventId", "id", "isBreak", "name", "organizationId", "requiredStaffCount", "tenantId" FROM "Role";
DROP TABLE "Role";
ALTER TABLE "new_Role" RENAME TO "Role";
CREATE INDEX "Role_organizationId_idx" ON "Role"("organizationId");
CREATE INDEX "Role_tenantId_eventId_idx" ON "Role"("tenantId", "eventId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
