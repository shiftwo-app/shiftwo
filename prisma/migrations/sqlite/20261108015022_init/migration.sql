-- CreateTable
CREATE TABLE "Staff" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "unavailableTimes" JSONB NOT NULL
);

-- CreateTable
CREATE TABLE "Role" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "color" TEXT NOT NULL,
    "requiredStaffCount" INTEGER NOT NULL
);

-- CreateTable
CREATE TABLE "Event" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "Room" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "timeTable" JSONB NOT NULL,
    "eventId" TEXT NOT NULL,
    CONSTRAINT "Room_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Shift" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "staffId" TEXT NOT NULL,
    "roleId" TEXT NOT NULL,
    "timeRange" JSONB NOT NULL,
    "isPreferredRole" BOOLEAN NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'draft',
    CONSTRAINT "Shift_staffId_fkey" FOREIGN KEY ("staffId") REFERENCES "Staff" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Shift_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "Role" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ShiftSetting" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "timeUnitMinutes" INTEGER NOT NULL
);

-- CreateTable
CREATE TABLE "_StaffPreferredRoles" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,
    CONSTRAINT "_StaffPreferredRoles_A_fkey" FOREIGN KEY ("A") REFERENCES "Role" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "_StaffPreferredRoles_B_fkey" FOREIGN KEY ("B") REFERENCES "Staff" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "_StaffPreferredRoles_AB_unique" ON "_StaffPreferredRoles"("A", "B");

-- CreateIndex
CREATE INDEX "_StaffPreferredRoles_B_index" ON "_StaffPreferredRoles"("B");
