-- AlterTable
ALTER TABLE "Event" ADD COLUMN     "positionsEnabled" BOOLEAN;

-- AlterTable
ALTER TABLE "Organization" ADD COLUMN     "positionsEnabled" BOOLEAN NOT NULL DEFAULT true;

-- AlterTable
ALTER TABLE "Shift" ALTER COLUMN "roleId" DROP NOT NULL;

-- AlterTable
ALTER TABLE "Tenant" ADD COLUMN     "positionsEnabled" BOOLEAN;
