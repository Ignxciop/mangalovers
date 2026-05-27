-- CreateTable
CREATE TABLE "scraper_runs" (
    "id" SERIAL NOT NULL,
    "provider" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'running',
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finishedAt" TIMESTAMP(3),
    "seriesProcessed" INTEGER NOT NULL DEFAULT 0,
    "chaptersCreated" INTEGER NOT NULL DEFAULT 0,
    "chaptersUpdated" INTEGER NOT NULL DEFAULT 0,
    "pagesScraped" INTEGER NOT NULL DEFAULT 0,
    "errors" INTEGER NOT NULL DEFAULT 0,
    "errorMessage" TEXT,

    CONSTRAINT "scraper_runs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "scraper_runs_provider_startedAt_idx" ON "scraper_runs"("provider", "startedAt");

-- CreateIndex
CREATE INDEX "scraper_runs_startedAt_idx" ON "scraper_runs"("startedAt");
