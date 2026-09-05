-- AlterTable
ALTER TABLE "urdb_rates" ADD COLUMN     "annual_min_charge" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "fixed_daily_charge" DOUBLE PRECISION NOT NULL DEFAULT 0;
