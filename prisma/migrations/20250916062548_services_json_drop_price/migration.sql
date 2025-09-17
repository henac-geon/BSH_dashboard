/*
  Warnings:

  - You are about to drop the column `priceRange` on the `Business` table. All the data in the column will be lost.
  - Made the column `phone` on table `Business` required. This step will fail if there are existing NULL values in that column.
  - Made the column `openingHours` on table `Business` required. This step will fail if there are existing NULL values in that column.
  - Changed the type of `services` on the `Business` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- AlterTable
ALTER TABLE "public"."Business" DROP COLUMN "priceRange",
ALTER COLUMN "phone" SET NOT NULL,
ALTER COLUMN "openingHours" SET NOT NULL,
DROP COLUMN "services",
ADD COLUMN     "services" JSONB NOT NULL;
