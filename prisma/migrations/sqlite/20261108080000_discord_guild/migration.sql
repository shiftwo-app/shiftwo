-- AlterTable
ALTER TABLE "Member" ADD COLUMN "avatarUrl" TEXT;
ALTER TABLE "Member" ADD COLUMN "guildSuspendedAt" DATETIME;

-- AlterTable
ALTER TABLE "Organization" ADD COLUMN "discordGuildIcon" TEXT;
ALTER TABLE "Organization" ADD COLUMN "discordGuildId" TEXT;
ALTER TABLE "Organization" ADD COLUMN "discordGuildName" TEXT;

