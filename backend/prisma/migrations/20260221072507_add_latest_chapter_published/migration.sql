-- AlterTable
ALTER TABLE "Series" ADD COLUMN     "lastChapterPublishedAt" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "Series_name_idx" ON "Series"("name");
