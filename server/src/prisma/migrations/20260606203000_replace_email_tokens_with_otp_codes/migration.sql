DROP TABLE IF EXISTS "email_verification_tokens";

CREATE TABLE IF NOT EXISTS "email_verification_codes" (
  "id" SERIAL PRIMARY KEY,
  "user_id" INTEGER NOT NULL,
  "code" VARCHAR(64) NOT NULL,
  "attempts" INTEGER NOT NULL DEFAULT 0,
  "expires_at" TIMESTAMP(3) NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "email_verification_codes_user_id_fkey"
    FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "email_verification_codes_user_id_key"
  ON "email_verification_codes"("user_id");

CREATE INDEX IF NOT EXISTS "email_verification_codes_expires_at_idx"
  ON "email_verification_codes"("expires_at");
