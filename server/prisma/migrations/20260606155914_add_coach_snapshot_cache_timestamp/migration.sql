-- AlterTable
ALTER TABLE "coach_snapshots" ADD COLUMN "updated_at" TIMESTAMP(3);
UPDATE "coach_snapshots" SET "updated_at" = "created_at" WHERE "updated_at" IS NULL;
ALTER TABLE "coach_snapshots" ALTER COLUMN "updated_at" SET NOT NULL;

-- CreateIndex
CREATE INDEX "coach_snapshots_user_id_updated_at_idx" ON "coach_snapshots"("user_id", "updated_at");
