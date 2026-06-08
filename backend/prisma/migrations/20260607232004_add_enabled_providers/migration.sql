-- AlterTable
ALTER TABLE "scraper_config" ADD COLUMN     "enabledProviders" JSONB NOT NULL DEFAULT '["olympus","manhwaweb","leermangaesp"]';
