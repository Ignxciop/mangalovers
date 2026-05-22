-- DropIndex
DROP INDEX IF EXISTS "Chapter_seriesId_idx";

-- DropIndex
DROP INDEX IF EXISTS "Series_slug_idx";

-- DropIndex
DROP INDEX IF EXISTS "refresh_tokens_token_idx";

-- DropIndex
DROP INDEX IF EXISTS "refresh_tokens_userId_idx";

-- DropIndex
DROP INDEX IF EXISTS "user_chapter_reads_userId_idx";

-- DropIndex
DROP INDEX IF EXISTS "user_favorites_userId_idx";

-- AlterTable (idempotent: IF NOT EXISTS)
ALTER TABLE "Chapter" ADD COLUMN IF NOT EXISTS "number" DOUBLE PRECISION;

-- Backfill number from existing chapter names
UPDATE "Chapter"
SET "number" = CAST(SUBSTRING("name" FROM '([0-9]+(\.[0-9]+)?)') AS DOUBLE PRECISION)
WHERE "number" IS NULL AND "name" ~ '[0-9]';

-- CreateIndex
CREATE INDEX "Chapter_seriesId_number_idx" ON "Chapter"("seriesId", "number");

-- CreateIndex
CREATE INDEX "refresh_tokens_userId_isRevoked_expiresAt_idx" ON "refresh_tokens"("userId", "isRevoked", "expiresAt");
