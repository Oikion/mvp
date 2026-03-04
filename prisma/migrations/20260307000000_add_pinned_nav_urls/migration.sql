-- AlterTable
ALTER TABLE "Users" ADD COLUMN "pinnedNavUrls" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
