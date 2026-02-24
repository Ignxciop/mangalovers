-- AlterTable
CREATE SEQUENCE chapter_id_seq;
ALTER TABLE "Chapter" ALTER COLUMN "id" SET DEFAULT nextval('chapter_id_seq');
ALTER SEQUENCE chapter_id_seq OWNED BY "Chapter"."id";
