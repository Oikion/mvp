-- CreateEnum
CREATE TYPE "LayoutPreference" AS ENUM ('DEFAULT', 'WIDE');

-- AlterTable
ALTER TABLE "Users" ADD COLUMN "layoutPreference" "LayoutPreference" NOT NULL DEFAULT 'DEFAULT';
