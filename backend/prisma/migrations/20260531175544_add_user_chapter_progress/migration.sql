-- CreateTable
CREATE TABLE "user_chapter_progress" (
    "id" SERIAL NOT NULL,
    "userId" TEXT NOT NULL,
    "chapterId" INTEGER NOT NULL,
    "pageNumber" INTEGER,
    "percentage" INTEGER,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_chapter_progress_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "user_chapter_progress_userId_chapterId_key" ON "user_chapter_progress"("userId", "chapterId");

-- AddForeignKey
ALTER TABLE "user_chapter_progress" ADD CONSTRAINT "user_chapter_progress_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_chapter_progress" ADD CONSTRAINT "user_chapter_progress_chapterId_fkey" FOREIGN KEY ("chapterId") REFERENCES "Chapter"("id") ON DELETE CASCADE ON UPDATE CASCADE;
