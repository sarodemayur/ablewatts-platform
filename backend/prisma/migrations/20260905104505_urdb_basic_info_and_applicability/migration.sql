/*
  Warnings:

  - You are about to drop the column `supersedes_id` on the `urdb_rates` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "urdb_rates" DROP CONSTRAINT "urdb_rates_supersedes_id_fkey";

-- AlterTable
ALTER TABLE "urdb_rates" DROP COLUMN "supersedes_id",
ADD COLUMN     "assume_net_metering" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "basic_comments" TEXT,
ADD COLUMN     "compensation_for_distribution_generation" TEXT,
ADD COLUMN     "demand_applicability_history_months" INTEGER,
ADD COLUMN     "demand_applicability_max" DOUBLE PRECISION,
ADD COLUMN     "demand_applicability_min" DOUBLE PRECISION,
ADD COLUMN     "demand_applicability_unit" TEXT NOT NULL DEFAULT 'kW',
ADD COLUMN     "energy_applicability_history_months" INTEGER,
ADD COLUMN     "energy_applicability_max" DOUBLE PRECISION,
ADD COLUMN     "energy_applicability_min" DOUBLE PRECISION,
ADD COLUMN     "phase_wiring" TEXT,
ADD COLUMN     "service_type" TEXT,
ADD COLUMN     "service_voltage_max" DOUBLE PRECISION,
ADD COLUMN     "service_voltage_min" DOUBLE PRECISION,
ADD COLUMN     "source_parent" TEXT,
ADD COLUMN     "supersedes_label" TEXT,
ADD COLUMN     "voltage_category" TEXT;
