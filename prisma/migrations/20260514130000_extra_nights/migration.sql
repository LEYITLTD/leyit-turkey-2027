-- AlterTable: add extra nights fields to bookings
ALTER TABLE "bookings"
  ADD COLUMN "extraNightsBefore" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "extraNightsAfter"  INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "extraNightsCost"   INTEGER NOT NULL DEFAULT 0;
