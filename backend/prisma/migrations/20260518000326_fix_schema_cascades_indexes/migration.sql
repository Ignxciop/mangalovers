/*
  Warnings:

  - Made the column `status` on table `user_favorites` required. This step will fail if there are existing NULL values in that column.

*/
-- DropForeignKey
ALTER TABLE "ProviderSeries" DROP CONSTRAINT "ProviderSeries_providerId_fkey";

-- DropForeignKey
ALTER TABLE "ProviderSeries" DROP CONSTRAINT "ProviderSeries_seriesId_fkey";

-- AlterTable
ALTER TABLE "user_favorites" ALTER COLUMN "status" SET NOT NULL;

-- CreateIndex
CREATE INDEX "Chapter_seriesId_publishedAt_idx" ON "Chapter"("seriesId", "publishedAt");

-- CreateIndex
CREATE INDEX "ProviderChapter_providerId_idx" ON "ProviderChapter"("providerId");

-- AddForeignKey
ALTER TABLE "ProviderSeries" ADD CONSTRAINT "ProviderSeries_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "Provider"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProviderSeries" ADD CONSTRAINT "ProviderSeries_seriesId_fkey" FOREIGN KEY ("seriesId") REFERENCES "Series"("id") ON DELETE CASCADE ON UPDATE CASCADE;
