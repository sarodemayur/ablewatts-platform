/*
  Warnings:

  - The primary key for the `homepage_content` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - Changed the type of `key` on the `homepage_content` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- CreateEnum
CREATE TYPE "LookupCategory" AS ENUM ('sector', 'unit', 'service_type', 'voltage_category', 'phase_wire');

-- CreateEnum
CREATE TYPE "HomepageContentKey" AS ENUM ('about_us', 'contact_us', 'terms_of_service', 'privacy_policy');

-- AlterTable
ALTER TABLE "app_users" ADD COLUMN     "lastName" TEXT;

-- AlterTable
ALTER TABLE "feedback" ADD COLUMN     "email" TEXT,
ADD COLUMN     "name" TEXT;

-- AlterTable
ALTER TABLE "homepage_content" DROP CONSTRAINT "homepage_content_pkey",
DROP COLUMN "key",
ADD COLUMN     "key" "HomepageContentKey" NOT NULL,
ADD CONSTRAINT "homepage_content_pkey" PRIMARY KEY ("key");

-- CreateTable
CREATE TABLE "lookups" (
    "id" SERIAL NOT NULL,
    "category" "LookupCategory" NOT NULL,
    "code" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "lookups_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "surveys" (
    "id" SERIAL NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "questions" JSONB NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "surveys_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "survey_responses" (
    "id" SERIAL NOT NULL,
    "survey_id" INTEGER NOT NULL,
    "app_user_id" INTEGER,
    "answers" JSONB NOT NULL,
    "submitted_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "survey_responses_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "lookups_category_code_key" ON "lookups"("category", "code");

-- AddForeignKey
ALTER TABLE "feedback" ADD CONSTRAINT "feedback_app_user_id_fkey" FOREIGN KEY ("app_user_id") REFERENCES "app_users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "survey_responses" ADD CONSTRAINT "survey_responses_survey_id_fkey" FOREIGN KEY ("survey_id") REFERENCES "surveys"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "survey_responses" ADD CONSTRAINT "survey_responses_app_user_id_fkey" FOREIGN KEY ("app_user_id") REFERENCES "app_users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
