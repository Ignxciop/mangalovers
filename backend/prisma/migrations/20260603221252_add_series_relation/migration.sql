-- CreateTable
CREATE TABLE "series_relations" (
    "id" SERIAL NOT NULL,
    "primarySeriesId" INTEGER NOT NULL,
    "fallbackSeriesId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "series_relations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "series_relations_primarySeriesId_fallbackSeriesId_key" ON "series_relations"("primarySeriesId", "fallbackSeriesId");

-- AddForeignKey
ALTER TABLE "series_relations" ADD CONSTRAINT "series_relations_primarySeriesId_fkey" FOREIGN KEY ("primarySeriesId") REFERENCES "Series"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "series_relations" ADD CONSTRAINT "series_relations_fallbackSeriesId_fkey" FOREIGN KEY ("fallbackSeriesId") REFERENCES "Series"("id") ON DELETE CASCADE ON UPDATE CASCADE;
