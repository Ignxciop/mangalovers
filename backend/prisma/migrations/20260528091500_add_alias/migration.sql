-- AlterTable
ALTER TABLE "users" ADD COLUMN "alias" TEXT;
ALTER TABLE "users" ADD COLUMN "aliasChanged" BOOLEAN NOT NULL DEFAULT false;
-- CreateIndex
CREATE UNIQUE INDEX "users_alias_key" ON "users"("alias");
