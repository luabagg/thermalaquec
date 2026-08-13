-- Existing quotations belong to Lucas (lucas@thermalaquec.com.br).
ALTER TABLE "quotations" ADD COLUMN "owner_user_id" UUID NOT NULL DEFAULT '720c6b26-fc8f-43b8-9fc1-3bfd07af8019';

ALTER TABLE "quotations" ALTER COLUMN "owner_user_id" DROP DEFAULT;

CREATE INDEX "quotations_owner_user_id_idx" ON "quotations"("owner_user_id");
