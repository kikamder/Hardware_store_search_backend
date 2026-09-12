-- AlterTable
ALTER TABLE "shops" ALTER COLUMN "approveBy" DROP DEFAULT;

-- AddForeignKey
ALTER TABLE "shops" ADD CONSTRAINT "shops_approveBy_fkey" FOREIGN KEY ("approveBy") REFERENCES "users"("userId") ON DELETE RESTRICT ON UPDATE CASCADE;
