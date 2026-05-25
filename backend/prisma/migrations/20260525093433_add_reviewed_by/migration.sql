-- AlterTable
ALTER TABLE "suggestions" ADD COLUMN     "reviewedById" TEXT;

-- CreateIndex
CREATE INDEX "suggestions_reviewedById_idx" ON "suggestions"("reviewedById");

-- AddForeignKey
ALTER TABLE "suggestions" ADD CONSTRAINT "suggestions_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
