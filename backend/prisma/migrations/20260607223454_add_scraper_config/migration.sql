-- AlterTable
ALTER TABLE "scraper_runs" ADD COLUMN     "triggeredBy" TEXT DEFAULT 'cron';

-- CreateTable
CREATE TABLE "scraper_config" (
    "id" SERIAL NOT NULL,
    "autoEnabled" BOOLEAN NOT NULL DEFAULT true,
    "intervalMinutes" INTEGER NOT NULL DEFAULT 60,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "scraper_config_pkey" PRIMARY KEY ("id")
);
