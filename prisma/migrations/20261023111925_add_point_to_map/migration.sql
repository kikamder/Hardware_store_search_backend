/*
  Warnings:

  - You are about to alter the column `latitude` on the `shops` table. The data in that column could be lost. The data in that column will be cast from `Decimal(65,30)` to `Decimal(10,7)`.
  - You are about to alter the column `longitude` on the `shops` table. The data in that column could be lost. The data in that column will be cast from `Decimal(65,30)` to `Decimal(10,7)`.
  - You are about to alter the column `latitude` on the `users` table. The data in that column could be lost. The data in that column will be cast from `Decimal(65,30)` to `Decimal(10,7)`.
  - You are about to alter the column `longitude` on the `users` table. The data in that column could be lost. The data in that column will be cast from `Decimal(65,30)` to `Decimal(10,7)`.

*/
-- AlterTable
ALTER TABLE "shops" ALTER COLUMN "latitude" SET DATA TYPE DECIMAL(10,7),
ALTER COLUMN "longitude" SET DATA TYPE DECIMAL(10,7);

-- AlterTable
ALTER TABLE "users" ALTER COLUMN "latitude" SET DATA TYPE DECIMAL(10,7),
ALTER COLUMN "longitude" SET DATA TYPE DECIMAL(10,7);
