/*
  Warnings:

  - A unique constraint covering the columns `[providerId,seriesId]` on the table `ProviderSeries` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "ProviderSeries_seriesId_idx";

-- CreateIndex
CREATE UNIQUE INDEX "ProviderSeries_providerId_seriesId_key" ON "ProviderSeries"("providerId", "seriesId");
