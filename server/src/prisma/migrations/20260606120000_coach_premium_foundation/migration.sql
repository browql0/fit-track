ALTER TABLE "profiles" ADD COLUMN "target_weight_kg" DOUBLE PRECISION;
ALTER TABLE "goal_snapshots" ADD COLUMN "target_weight_kg" DOUBLE PRECISION;

CREATE TABLE "hydration_entries" (
  "id" SERIAL NOT NULL,
  "user_id" INTEGER NOT NULL,
  "amount_ml" INTEGER NOT NULL,
  "entry_date" DATE NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "hydration_entries_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "coach_snapshots" (
  "id" SERIAL NOT NULL,
  "user_id" INTEGER NOT NULL,
  "score" INTEGER NOT NULL,
  "nutrition" INTEGER NOT NULL,
  "training" INTEGER NOT NULL,
  "progression" INTEGER NOT NULL,
  "consistency" INTEGER NOT NULL,
  "payload" JSONB NOT NULL,
  "snapshot_date" DATE NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "coach_snapshots_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "mission_completions" (
  "id" SERIAL NOT NULL,
  "user_id" INTEGER NOT NULL,
  "mission_id" VARCHAR(100) NOT NULL,
  "mission_date" DATE NOT NULL,
  "xp_earned" INTEGER NOT NULL DEFAULT 0,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "mission_completions_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "user_activities" (
  "id" SERIAL NOT NULL,
  "user_id" INTEGER NOT NULL,
  "activity_type" VARCHAR(50) NOT NULL,
  "activity_date" DATE NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "user_activities_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "hydration_entries_user_id_entry_date_idx" ON "hydration_entries"("user_id", "entry_date");
CREATE UNIQUE INDEX "coach_snapshots_user_id_snapshot_date_key" ON "coach_snapshots"("user_id", "snapshot_date");
CREATE INDEX "coach_snapshots_user_id_snapshot_date_idx" ON "coach_snapshots"("user_id", "snapshot_date");
CREATE UNIQUE INDEX "mission_completions_user_id_mission_id_mission_date_key" ON "mission_completions"("user_id", "mission_id", "mission_date");
CREATE INDEX "mission_completions_user_id_mission_date_idx" ON "mission_completions"("user_id", "mission_date");
CREATE UNIQUE INDEX "user_activities_user_id_activity_type_activity_date_key" ON "user_activities"("user_id", "activity_type", "activity_date");
CREATE INDEX "user_activities_user_id_activity_date_idx" ON "user_activities"("user_id", "activity_date");

ALTER TABLE "hydration_entries" ADD CONSTRAINT "hydration_entries_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "coach_snapshots" ADD CONSTRAINT "coach_snapshots_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "mission_completions" ADD CONSTRAINT "mission_completions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "user_activities" ADD CONSTRAINT "user_activities_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
