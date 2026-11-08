-- AlterTable
ALTER TABLE "Role" ADD COLUMN     "staffingRules" JSONB NOT NULL DEFAULT '[]';
