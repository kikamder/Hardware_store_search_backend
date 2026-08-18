-- CreateEnum
CREATE TYPE "Category" AS ENUM ('CPU', 'MAINBOARD', 'VGA', 'RAM', 'STORAGE', 'PSU', 'CASE', 'COOLER');

-- CreateEnum
CREATE TYPE "ShopStatus" AS ENUM ('PENDING', 'OPEN', 'CLOSED', 'REJECTED', 'SUSPENDED');

-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('CUSTOMER', 'shop', 'admin');

-- CreateEnum
CREATE TYPE "UserStatus" AS ENUM ('ACTIVE', 'SUSPENDED');

-- CreateTable
CREATE TABLE "cpus" (
    "masterId" INTEGER NOT NULL,
    "family" VARCHAR(50) NOT NULL,
    "processorClass" VARCHAR(50) NOT NULL,
    "socket" VARCHAR(50) NOT NULL,

    CONSTRAINT "cpus_pkey" PRIMARY KEY ("masterId")
);

-- CreateTable
CREATE TABLE "favorite_products" (
    "customerId" INTEGER NOT NULL,
    "shopProductId" INTEGER NOT NULL,

    CONSTRAINT "favorite_products_pkey" PRIMARY KEY ("customerId","shopProductId")
);

-- CreateTable
CREATE TABLE "favorite_shops" (
    "customerId" INTEGER NOT NULL,
    "shopId" INTEGER NOT NULL,

    CONSTRAINT "favorite_shops_pkey" PRIMARY KEY ("customerId","shopId")
);

-- CreateTable
CREATE TABLE "mainboards" (
    "masterId" INTEGER NOT NULL,
    "formFactor" VARCHAR(50) NOT NULL,
    "socket" VARCHAR(50) NOT NULL,
    "chipset" VARCHAR(50) NOT NULL,

    CONSTRAINT "mainboards_pkey" PRIMARY KEY ("masterId")
);

-- CreateTable
CREATE TABLE "master_hardware" (
    "masterId" SERIAL NOT NULL,
    "hardwareKey" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "brand" TEXT NOT NULL,
    "category" "Category" NOT NULL,
    "searchCount" INTEGER NOT NULL DEFAULT 0,
    "specs" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "master_hardware_pkey" PRIMARY KEY ("masterId")
);

-- CreateTable
CREATE TABLE "psus" (
    "masterId" INTEGER NOT NULL,
    "watt" INTEGER NOT NULL,
    "standard80Plus" VARCHAR(100) NOT NULL,

    CONSTRAINT "psus_pkey" PRIMARY KEY ("masterId")
);

-- CreateTable
CREATE TABLE "rams" (
    "masterId" INTEGER NOT NULL,
    "ramType" VARCHAR(50) NOT NULL,
    "capacityGB" INTEGER NOT NULL,
    "busSpeed" INTEGER NOT NULL,

    CONSTRAINT "rams_pkey" PRIMARY KEY ("masterId")
);

-- CreateTable
CREATE TABLE "shop_products" (
    "shopProductId" SERIAL NOT NULL,
    "shopId" INTEGER NOT NULL,
    "masterId" INTEGER NOT NULL,
    "customTitle" VARCHAR(255),
    "price" DECIMAL(65,30) NOT NULL,
    "warranty" VARCHAR(20),
    "description" TEXT,
    "imageUrl" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "shop_products_pkey" PRIMARY KEY ("shopProductId")
);

-- CreateTable
CREATE TABLE "shops" (
    "shopId" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "ownerFirstName" VARCHAR(50) NOT NULL,
    "ownerLastName" VARCHAR(50) NOT NULL,
    "profileImageUrl" TEXT,
    "shopName" VARCHAR(100) NOT NULL,
    "shopDescription" TEXT,
    "addressText" TEXT,
    "subDistrict" VARCHAR(50),
    "district" VARCHAR(50),
    "province" VARCHAR(50),
    "zipCode" VARCHAR(10),
    "contactChannels" JSONB,
    "ownerPhone" VARCHAR(13),
    "operatingHours" VARCHAR(100),
    "latitude" DECIMAL(65,30),
    "longitude" DECIMAL(65,30),
    "shopStatus" "ShopStatus" NOT NULL,
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "shops_pkey" PRIMARY KEY ("shopId")
);

-- CreateTable
CREATE TABLE "storages" (
    "masterId" INTEGER NOT NULL,
    "storageType" VARCHAR(50) NOT NULL,
    "interfaceType" VARCHAR(50) NOT NULL,
    "capacityGB" INTEGER NOT NULL,

    CONSTRAINT "storages_pkey" PRIMARY KEY ("masterId")
);

-- CreateTable
CREATE TABLE "users" (
    "userId" SERIAL NOT NULL,
    "email" VARCHAR(100) NOT NULL,
    "displayName" VARCHAR(50) NOT NULL,
    "userRole" "UserRole" NOT NULL,
    "userStatus" "UserStatus" NOT NULL,
    "refreshToken" TEXT,
    "profilePicture" TEXT,

    CONSTRAINT "users_pkey" PRIMARY KEY ("userId")
);

-- CreateTable
CREATE TABLE "vgas" (
    "masterId" INTEGER NOT NULL,
    "series" VARCHAR(50) NOT NULL,
    "chipset" TEXT,
    "vramSize" INTEGER,

    CONSTRAINT "vgas_pkey" PRIMARY KEY ("masterId")
);

-- CreateIndex
CREATE INDEX "cpus_family_idx" ON "cpus"("family");

-- CreateIndex
CREATE INDEX "cpus_socket_idx" ON "cpus"("socket");

-- CreateIndex
CREATE INDEX "mainboards_formFactor_idx" ON "mainboards"("formFactor");

-- CreateIndex
CREATE INDEX "mainboards_socket_idx" ON "mainboards"("socket");

-- CreateIndex
CREATE UNIQUE INDEX "master_hardware_hardwareKey_key" ON "master_hardware"("hardwareKey");

-- CreateIndex
CREATE INDEX "master_hardware_category_brand_idx" ON "master_hardware"("category", "brand");

-- CreateIndex
CREATE INDEX "psus_watt_idx" ON "psus"("watt");

-- CreateIndex
CREATE INDEX "rams_capacityGB_busSpeed_idx" ON "rams"("capacityGB", "busSpeed");

-- CreateIndex
CREATE INDEX "rams_ramType_idx" ON "rams"("ramType");

-- CreateIndex
CREATE INDEX "shop_products_masterId_idx" ON "shop_products"("masterId");

-- CreateIndex
CREATE INDEX "shop_products_shopId_idx" ON "shop_products"("shopId");

-- CreateIndex
CREATE UNIQUE INDEX "shops_userId_key" ON "shops"("userId");

-- CreateIndex
CREATE INDEX "storages_capacityGB_idx" ON "storages"("capacityGB");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "vgas_series_idx" ON "vgas"("series");

-- AddForeignKey
ALTER TABLE "cpus" ADD CONSTRAINT "cpus_masterId_fkey" FOREIGN KEY ("masterId") REFERENCES "master_hardware"("masterId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "favorite_products" ADD CONSTRAINT "favorite_products_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "users"("userId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "favorite_products" ADD CONSTRAINT "favorite_products_shopProductId_fkey" FOREIGN KEY ("shopProductId") REFERENCES "shop_products"("shopProductId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "favorite_shops" ADD CONSTRAINT "favorite_shops_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "users"("userId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "favorite_shops" ADD CONSTRAINT "favorite_shops_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES "shops"("shopId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mainboards" ADD CONSTRAINT "mainboards_masterId_fkey" FOREIGN KEY ("masterId") REFERENCES "master_hardware"("masterId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "psus" ADD CONSTRAINT "psus_masterId_fkey" FOREIGN KEY ("masterId") REFERENCES "master_hardware"("masterId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rams" ADD CONSTRAINT "rams_masterId_fkey" FOREIGN KEY ("masterId") REFERENCES "master_hardware"("masterId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shop_products" ADD CONSTRAINT "shop_products_masterId_fkey" FOREIGN KEY ("masterId") REFERENCES "master_hardware"("masterId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shop_products" ADD CONSTRAINT "shop_products_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES "shops"("shopId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shops" ADD CONSTRAINT "shops_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("userId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "storages" ADD CONSTRAINT "storages_masterId_fkey" FOREIGN KEY ("masterId") REFERENCES "master_hardware"("masterId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vgas" ADD CONSTRAINT "vgas_masterId_fkey" FOREIGN KEY ("masterId") REFERENCES "master_hardware"("masterId") ON DELETE CASCADE ON UPDATE CASCADE;
