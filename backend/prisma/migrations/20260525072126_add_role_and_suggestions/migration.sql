-- CreateEnum
CREATE TYPE "Role" AS ENUM ('ADMIN', 'USER');

-- CreateEnum
CREATE TYPE "SuggestionType" AS ENUM ('BUG', 'SUGGESTION', 'CONTENT_ERROR', 'TECHNICAL_PROBLEM', 'OTHER');

-- CreateEnum
CREATE TYPE "SuggestionStatus" AS ENUM ('OPEN', 'REVIEWING', 'RESOLVED', 'REJECTED', 'CLOSED');

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "role" "Role" NOT NULL DEFAULT 'USER';

-- CreateTable
CREATE TABLE "suggestions" (
    "id" SERIAL NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "SuggestionType" NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "image" TEXT,
    "status" "SuggestionStatus" NOT NULL DEFAULT 'OPEN',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "suggestions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "suggestions_status_idx" ON "suggestions"("status");

-- CreateIndex
CREATE INDEX "suggestions_userId_idx" ON "suggestions"("userId");

-- AddForeignKey
ALTER TABLE "suggestions" ADD CONSTRAINT "suggestions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
