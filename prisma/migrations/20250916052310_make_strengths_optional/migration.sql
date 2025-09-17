/*
  Warnings:

  - Made the column `services` on table `Business` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "public"."Business" ADD COLUMN     "holidays" TEXT,
ADD COLUMN     "openingHours" TEXT,
ADD COLUMN     "parkingInfo" TEXT,
ADD COLUMN     "priceRange" TEXT,
ADD COLUMN     "snsUrl" TEXT,
ADD COLUMN     "strengths" TEXT,
ALTER COLUMN "services" SET NOT NULL;
