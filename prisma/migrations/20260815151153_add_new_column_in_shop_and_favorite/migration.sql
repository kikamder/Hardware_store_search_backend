/*
  Warnings:

  - A unique constraint covering the columns `[refreshToken]` on the table `users` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "favorite_products" ADD COLUMN     "add_date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "favorite_shops" ADD COLUMN     "add_date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "shops" ADD COLUMN     "approveAt" TIMESTAMP(3),
ADD COLUMN     "businessRegImage" TEXT,
ADD COLUMN     "idCardImage" TEXT,
ADD COLUMN     "storeImnage" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "users_refreshToken_key" ON "users"("refreshToken");
