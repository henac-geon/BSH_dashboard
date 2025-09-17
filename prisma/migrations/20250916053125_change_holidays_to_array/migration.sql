/*
  Warnings:

  - The `holidays` column on the `Business` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- AlterTable
ALTER TABLE "public"."Business" DROP COLUMN "holidays",
ADD COLUMN     "holidays" TEXT[];
