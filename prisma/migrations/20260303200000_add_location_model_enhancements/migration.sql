-- CreateEnum
CREATE TYPE "FrontageType" AS ENUM ('MAIN_ROAD', 'SECONDARY_ROAD', 'PEDESTRIAN', 'CORNER', 'SQUARE', 'CUL_DE_SAC', 'NONE');

-- AlterTable: Add new location, legal, and tax fields to Properties
ALTER TABLE "Properties" ADD COLUMN "building_block_ot" TEXT;
ALTER TABLE "Properties" ADD COLUMN "frontage_type" "FrontageType";
ALTER TABLE "Properties" ADD COLUMN "land_registry_office" TEXT;
ALTER TABLE "Properties" ADD COLUMN "objective_zone" TEXT;
ALTER TABLE "Properties" ADD COLUMN "region" TEXT;
ALTER TABLE "Properties" ADD COLUMN "regional_unit" TEXT;
