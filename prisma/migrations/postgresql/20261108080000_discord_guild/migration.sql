-- AlterTable
ALTER TABLE "Member" ADD COLUMN     "avatarUrl" TEXT,
ADD COLUMN     "guildSuspendedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "Organization" ADD COLUMN     "discordGuildIcon" TEXT,
ADD COLUMN     "discordGuildId" TEXT,
ADD COLUMN     "discordGuildName" TEXT;

