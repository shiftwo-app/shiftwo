-- AlterTable
ALTER TABLE "Staff" ADD COLUMN     "memberId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Staff_memberId_key" ON "Staff"("memberId");

-- AddForeignKey
ALTER TABLE "Staff" ADD CONSTRAINT "Staff_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "Member"("id") ON DELETE SET NULL ON UPDATE CASCADE;

