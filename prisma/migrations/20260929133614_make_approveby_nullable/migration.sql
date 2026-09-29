-- DropForeignKey
ALTER TABLE "shops" DROP CONSTRAINT "shops_approveBy_fkey";

-- AlterTable
ALTER TABLE "shops" ALTER COLUMN "approveBy" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "shops" ADD CONSTRAINT "shops_approveBy_fkey" FOREIGN KEY ("approveBy") REFERENCES "users"("userId") ON DELETE SET NULL ON UPDATE CASCADE;
