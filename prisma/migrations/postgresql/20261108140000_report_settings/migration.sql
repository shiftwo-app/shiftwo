-- AlterTable
ALTER TABLE "Role" ADD COLUMN     "isBreak" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "Tenant" ADD COLUMN     "breakGapMinutes" INTEGER NOT NULL DEFAULT 15;
