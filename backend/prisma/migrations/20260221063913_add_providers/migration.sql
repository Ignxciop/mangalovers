-- CreateTable
CREATE TABLE "Provider" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Provider_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProviderSeries" (
    "id" SERIAL NOT NULL,
    "providerId" INTEGER NOT NULL,
    "externalId" INTEGER NOT NULL,
    "slug" TEXT NOT NULL,
    "seriesId" INTEGER NOT NULL,

    CONSTRAINT "ProviderSeries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProviderChapter" (
    "id" SERIAL NOT NULL,
    "providerId" INTEGER NOT NULL,
    "externalId" INTEGER NOT NULL,
    "chapterId" INTEGER NOT NULL,

    CONSTRAINT "ProviderChapter_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Provider_name_key" ON "Provider"("name");

-- CreateIndex
CREATE INDEX "ProviderSeries_seriesId_idx" ON "ProviderSeries"("seriesId");

-- CreateIndex
CREATE UNIQUE INDEX "ProviderSeries_providerId_externalId_key" ON "ProviderSeries"("providerId", "externalId");

-- CreateIndex
CREATE INDEX "ProviderChapter_chapterId_idx" ON "ProviderChapter"("chapterId");

-- CreateIndex
CREATE UNIQUE INDEX "ProviderChapter_providerId_externalId_key" ON "ProviderChapter"("providerId", "externalId");

-- AddForeignKey
ALTER TABLE "ProviderSeries" ADD CONSTRAINT "ProviderSeries_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "Provider"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProviderSeries" ADD CONSTRAINT "ProviderSeries_seriesId_fkey" FOREIGN KEY ("seriesId") REFERENCES "Series"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProviderChapter" ADD CONSTRAINT "ProviderChapter_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "Provider"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProviderChapter" ADD CONSTRAINT "ProviderChapter_chapterId_fkey" FOREIGN KEY ("chapterId") REFERENCES "Chapter"("id") ON DELETE CASCADE ON UPDATE CASCADE;
