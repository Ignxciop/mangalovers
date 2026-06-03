-- CreateEnum
CREATE TYPE "ProfileVisibility" AS ENUM ('PUBLIC', 'FRIENDS', 'PRIVATE');

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "profileVisibility" "ProfileVisibility" NOT NULL DEFAULT 'PUBLIC';
