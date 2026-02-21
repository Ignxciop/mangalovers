-- AlterTable
CREATE SEQUENCE series_id_seq;
ALTER TABLE "Series" ALTER COLUMN "id" SET DEFAULT nextval('series_id_seq');
ALTER SEQUENCE series_id_seq OWNED BY "Series"."id";
