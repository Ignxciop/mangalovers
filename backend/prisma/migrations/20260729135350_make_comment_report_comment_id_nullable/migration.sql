-- DropForeignKey
ALTER TABLE "comment_reports" DROP CONSTRAINT "comment_reports_commentId_fkey";

-- AlterTable
ALTER TABLE "comment_reports" ALTER COLUMN "commentId" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "comment_reports" ADD CONSTRAINT "comment_reports_commentId_fkey" FOREIGN KEY ("commentId") REFERENCES "comments"("id") ON DELETE SET NULL ON UPDATE CASCADE;
