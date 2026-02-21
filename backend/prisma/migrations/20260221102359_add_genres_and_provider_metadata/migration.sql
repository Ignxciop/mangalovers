-- DropForeignKey
ALTER TABLE "ProviderSeries" DROP CONSTRAINT "ProviderSeries_providerId_fkey";

-- DropForeignKey
ALTER TABLE "ProviderSeries" DROP CONSTRAINT "ProviderSeries_seriesId_fkey";

-- AlterTable
ALTER TABLE "ProviderSeries" ADD COLUMN     "cover" TEXT,
ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "status" TEXT,
ADD COLUMN     "summary" TEXT,
ADD COLUMN     "updatedAt" TIMESTAMP(3),
ADD COLUMN     "url" TEXT,
ALTER COLUMN "externalId" SET DATA TYPE TEXT;

-- CreateTable
CREATE TABLE "Genre" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "Genre_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SeriesGenre" (
    "seriesId" INTEGER NOT NULL,
    "genreId" INTEGER NOT NULL,

    CONSTRAINT "SeriesGenre_pkey" PRIMARY KEY ("seriesId","genreId")
);

-- CreateIndex
CREATE UNIQUE INDEX "Genre_name_key" ON "Genre"("name");

-- CreateIndex
CREATE INDEX "Series_lastChapterPublishedAt_idx" ON "Series"("lastChapterPublishedAt");

-- AddForeignKey
ALTER TABLE "ProviderSeries" ADD CONSTRAINT "ProviderSeries_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "Provider"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProviderSeries" ADD CONSTRAINT "ProviderSeries_seriesId_fkey" FOREIGN KEY ("seriesId") REFERENCES "Series"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SeriesGenre" ADD CONSTRAINT "SeriesGenre_seriesId_fkey" FOREIGN KEY ("seriesId") REFERENCES "Series"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SeriesGenre" ADD CONSTRAINT "SeriesGenre_genreId_fkey" FOREIGN KEY ("genreId") REFERENCES "Genre"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
