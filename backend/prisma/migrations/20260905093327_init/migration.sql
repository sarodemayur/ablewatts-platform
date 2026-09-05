-- CreateEnum
CREATE TYPE "AdminType" AS ENUM ('super_admin', 'admin', 'editor');

-- CreateEnum
CREATE TYPE "RateStatus" AS ENUM ('approved', 'unapproved');

-- CreateEnum
CREATE TYPE "AppUserType" AS ENUM ('registered', 'demo', 'beta', 'guest', 'invite');

-- CreateTable
CREATE TABLE "admins" (
    "id" SERIAL NOT NULL,
    "type" "AdminType" NOT NULL DEFAULT 'admin',
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "access_level" INTEGER NOT NULL DEFAULT 50,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "password_hash" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_login_at" TIMESTAMP(3),

    CONSTRAINT "admins_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "urdb_rates" (
    "id" SERIAL NOT NULL,
    "label" TEXT,
    "name" TEXT NOT NULL,
    "utility" TEXT NOT NULL,
    "sector" TEXT NOT NULL,
    "state" TEXT,
    "description" TEXT,
    "source" TEXT,
    "status" "RateStatus" NOT NULL DEFAULT 'unapproved',
    "start_date" TIMESTAMP(3) NOT NULL,
    "end_date" TIMESTAMP(3),
    "fixed_monthly_charge" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "min_monthly_charge" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "rate_data" JSONB NOT NULL,
    "supersedes_id" INTEGER,
    "created_by_admin_id" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "urdb_rates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "green_data_files" (
    "id" SERIAL NOT NULL,
    "admin_id" INTEGER NOT NULL,
    "file_name" TEXT NOT NULL,
    "real_file_name" TEXT NOT NULL,
    "storage_path" TEXT NOT NULL,
    "is_sample" BOOLEAN NOT NULL DEFAULT false,
    "uploaded_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "green_data_files_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "admin_action_logs" (
    "id" SERIAL NOT NULL,
    "admin_id" INTEGER NOT NULL,
    "action_group" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "target_type" TEXT,
    "target_id" TEXT,
    "note" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "admin_action_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "app_users" (
    "id" SERIAL NOT NULL,
    "type" "AppUserType" NOT NULL,
    "email" TEXT NOT NULL,
    "firstName" TEXT,
    "is_converted" BOOLEAN NOT NULL DEFAULT false,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "app_users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "homepage_content" (
    "key" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "homepage_content_pkey" PRIMARY KEY ("key")
);

-- CreateTable
CREATE TABLE "feedback" (
    "id" SERIAL NOT NULL,
    "app_user_id" INTEGER,
    "message" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "feedback_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "admins_email_key" ON "admins"("email");

-- CreateIndex
CREATE UNIQUE INDEX "admins_username_key" ON "admins"("username");

-- CreateIndex
CREATE INDEX "urdb_rates_utility_sector_name_idx" ON "urdb_rates"("utility", "sector", "name");

-- CreateIndex
CREATE INDEX "urdb_rates_status_idx" ON "urdb_rates"("status");

-- CreateIndex
CREATE UNIQUE INDEX "app_users_email_key" ON "app_users"("email");

-- AddForeignKey
ALTER TABLE "urdb_rates" ADD CONSTRAINT "urdb_rates_supersedes_id_fkey" FOREIGN KEY ("supersedes_id") REFERENCES "urdb_rates"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "urdb_rates" ADD CONSTRAINT "urdb_rates_created_by_admin_id_fkey" FOREIGN KEY ("created_by_admin_id") REFERENCES "admins"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "green_data_files" ADD CONSTRAINT "green_data_files_admin_id_fkey" FOREIGN KEY ("admin_id") REFERENCES "admins"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "admin_action_logs" ADD CONSTRAINT "admin_action_logs_admin_id_fkey" FOREIGN KEY ("admin_id") REFERENCES "admins"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
