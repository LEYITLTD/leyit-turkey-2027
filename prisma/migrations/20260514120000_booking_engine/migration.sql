-- CreateEnum
CREATE TYPE "RoomCategory" AS ENUM ('SUPERIOR', 'FAMILY', 'SUITE');

-- CreateEnum
CREATE TYPE "RoomView" AS ENUM ('SEA', 'FOREST', 'ACCESSIBLE');

-- AlterTable: bookings — replace generic children/roomView/tier with proper age bands
ALTER TABLE "bookings"
  DROP COLUMN "children",
  DROP COLUMN "roomView",
  DROP COLUMN "tier",
  ADD COLUMN "child46"     INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "child711"    INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "discountAmt" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "infants"     INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "needsBed"    BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "needsCot"    BOOLEAN NOT NULL DEFAULT false;

-- AlterTable: discount_codes — support both percent and fixed-amount codes
ALTER TABLE "discount_codes"
  ADD COLUMN "discountFixed" INTEGER,
  ALTER COLUMN "discountPercent" DROP NOT NULL;

-- AlterTable: room_types — replace placeholder fields with full booking engine model
ALTER TABLE "room_types"
  DROP COLUMN "capacity",
  DROP COLUMN "features",
  DROP COLUMN "name",
  DROP COLUMN "rateGbp",
  DROP COLUMN "size",
  DROP COLUMN "soldRooms",
  DROP COLUMN "totalRooms",
  ADD COLUMN "addBedAllowed"  BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "addCotAllowed"  BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "bookableOnline" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN "bothAllowed"    BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "category"       "RoomCategory" NOT NULL,
  ADD COLUMN "description"    TEXT,
  ADD COLUMN "displayName"    TEXT NOT NULL,
  ADD COLUMN "isBundle"       BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "isSeaview"      BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "maxAdults"      INTEGER NOT NULL,
  ADD COLUMN "maxTotalPeople" INTEGER NOT NULL,
  ADD COLUMN "roomsBooked"    INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "totalInventory" INTEGER NOT NULL,
  DROP COLUMN "view",
  ADD COLUMN "view"           "RoomView" NOT NULL;

-- CreateTable: pricing_config
CREATE TABLE "pricing_config" (
  "id"                      TEXT NOT NULL,
  "nights"                  INTEGER NOT NULL DEFAULT 4,
  "rateAdultDoublePerNight" INTEGER NOT NULL,
  "rateAdultSinglePerNight" INTEGER NOT NULL,
  "rateInfantPerNight"      INTEGER NOT NULL,
  "rateChild46First"        INTEGER NOT NULL,
  "rateChild46Extra"        INTEGER NOT NULL,
  "rateChild711PerNight"    INTEGER NOT NULL,
  "seaviewSupplement"       INTEGER NOT NULL,
  "bundleRateAdultDouble"   INTEGER NOT NULL,
  "bundleRateChild711Night" INTEGER NOT NULL,
  "bundleRateChild46Extra"  INTEGER NOT NULL,
  "bundleDiscountPercent"   INTEGER NOT NULL DEFAULT 20,
  "isActive"                BOOLEAN NOT NULL DEFAULT true,
  "updatedAt"               TIMESTAMP(3) NOT NULL,
  "updatedBy"               TEXT,
  CONSTRAINT "pricing_config_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "bookings"
  ADD CONSTRAINT "bookings_roomTypeId_fkey"
  FOREIGN KEY ("roomTypeId") REFERENCES "room_types"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;
