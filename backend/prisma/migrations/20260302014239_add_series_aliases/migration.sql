-- CreateTable
CREATE TABLE "series_aliases" (
    "id" SERIAL NOT NULL,
    "seriesId" INTEGER NOT NULL,
    "alias" TEXT NOT NULL,

    CONSTRAINT "series_aliases_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "series_aliases_alias_key" ON "series_aliases"("alias");

-- AddForeignKey
ALTER TABLE "series_aliases" ADD CONSTRAINT "series_aliases_seriesId_fkey" FOREIGN KEY ("seriesId") REFERENCES "Series"("id") ON DELETE CASCADE ON UPDATE CASCADE;
