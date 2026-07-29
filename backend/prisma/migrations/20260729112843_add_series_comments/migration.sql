-- AlterTable
ALTER TABLE "comments" ADD COLUMN     "seriesId" INTEGER,
ALTER COLUMN "chapterId" DROP NOT NULL;

-- CreateIndex
CREATE INDEX "comments_seriesId_created_at_idx" ON "comments"("seriesId", "created_at");

-- AddForeignKey
ALTER TABLE "comments" ADD CONSTRAINT "comments_seriesId_fkey" FOREIGN KEY ("seriesId") REFERENCES "Series"("id") ON DELETE CASCADE ON UPDATE CASCADE;
