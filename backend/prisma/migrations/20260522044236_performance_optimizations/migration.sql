-- DropIndex
DROP INDEX "Chapter_seriesId_idx";

-- DropIndex
DROP INDEX "Series_slug_idx";

-- DropIndex
DROP INDEX "refresh_tokens_token_idx";

-- DropIndex
DROP INDEX "refresh_tokens_userId_idx";

-- DropIndex
DROP INDEX "user_chapter_reads_userId_idx";

-- DropIndex
DROP INDEX "user_favorites_userId_idx";

-- AlterTable
ALTER TABLE "Chapter" ADD COLUMN     "number" DOUBLE PRECISION;

-- Backfill number from existing chapter names
UPDATE "Chapter" SET "number" = CAST(SUBSTRING("name" FROM '(\d+(\.\d+)?)') AS DOUBLE PRECISION);

-- CreateIndex
CREATE INDEX "Chapter_seriesId_number_idx" ON "Chapter"("seriesId", "number");

-- CreateIndex
CREATE INDEX "refresh_tokens_userId_isRevoked_expiresAt_idx" ON "refresh_tokens"("userId", "isRevoked", "expiresAt");
