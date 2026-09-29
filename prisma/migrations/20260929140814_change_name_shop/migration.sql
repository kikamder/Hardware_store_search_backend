/*
  Warnings:

  - You are about to drop the column `storeImnage` on the `shops` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "shops" DROP COLUMN "storeImnage",
ADD COLUMN     "storeImage" TEXT;
