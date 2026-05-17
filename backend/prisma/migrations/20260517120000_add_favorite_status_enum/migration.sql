-- Create enum type
CREATE TYPE "FavoriteStatus" AS ENUM ('Siguiendo', 'Terminado');

-- Add new column with enum type
ALTER TABLE "user_favorites" ADD COLUMN "status_new" "FavoriteStatus" DEFAULT 'Siguiendo';

-- Migrate existing data
UPDATE "user_favorites" SET "status_new" = CASE
    WHEN "status" = 'Terminado' THEN 'Terminado'::"FavoriteStatus"
    ELSE 'Siguiendo'::"FavoriteStatus"
END;

-- Drop old column
ALTER TABLE "user_favorites" DROP COLUMN "status";

-- Rename new column
ALTER TABLE "user_favorites" RENAME COLUMN "status_new" TO "status";
