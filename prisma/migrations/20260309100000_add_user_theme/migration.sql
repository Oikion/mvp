-- AlterTable: add userTheme column with default "estate"
ALTER TABLE "Users" ADD COLUMN "userTheme" TEXT NOT NULL DEFAULT 'estate';
