-- AlterTable
ALTER TABLE "Event" ADD COLUMN "endsAt" DATETIME;
ALTER TABLE "Event" ADD COLUMN "preferenceDeadline" DATETIME;
ALTER TABLE "Event" ADD COLUMN "startsAt" DATETIME;

-- AlterTable
ALTER TABLE "Organization" ADD COLUMN "preferenceDeadline" DATETIME;

-- AlterTable
ALTER TABLE "Tenant" ADD COLUMN "preferenceDeadline" DATETIME;

-- CreateTable
CREATE TABLE "StaffPreference" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "organizationId" TEXT NOT NULL,
    "tenantId" TEXT,
    "eventId" TEXT,
    "scopeKey" TEXT NOT NULL,
    "staffId" TEXT NOT NULL,
    "breaks" JSONB NOT NULL,
    "memo" TEXT NOT NULL DEFAULT '',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "StaffPreference_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "StaffPreference_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "StaffPreference_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "StaffPreference_staffId_fkey" FOREIGN KEY ("staffId") REFERENCES "Staff" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "_StaffPreferencePositions" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,
    CONSTRAINT "_StaffPreferencePositions_A_fkey" FOREIGN KEY ("A") REFERENCES "Role" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "_StaffPreferencePositions_B_fkey" FOREIGN KEY ("B") REFERENCES "StaffPreference" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "StaffPreference_organizationId_idx" ON "StaffPreference"("organizationId");

-- CreateIndex
CREATE INDEX "StaffPreference_tenantId_idx" ON "StaffPreference"("tenantId");

-- CreateIndex
CREATE INDEX "StaffPreference_eventId_idx" ON "StaffPreference"("eventId");

-- CreateIndex
CREATE UNIQUE INDEX "StaffPreference_staffId_scopeKey_key" ON "StaffPreference"("staffId", "scopeKey");

-- CreateIndex
CREATE UNIQUE INDEX "_StaffPreferencePositions_AB_unique" ON "_StaffPreferencePositions"("A", "B");

-- CreateIndex
CREATE INDEX "_StaffPreferencePositions_B_index" ON "_StaffPreferencePositions"("B");
