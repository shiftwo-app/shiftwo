-- CreateEnum
CREATE TYPE "ShiftStatus" AS ENUM ('draft', 'confirmed');

-- AlterTable
ALTER TABLE "Shift" ADD COLUMN     "status" "ShiftStatus" NOT NULL DEFAULT 'draft';
