CREATE TABLE IF NOT EXISTS "email_verification_tokens" (
  "id" SERIAL PRIMARY KEY,
  "user_id" INTEGER NOT NULL,
  "token_hash" VARCHAR(64) NOT NULL,
  "expires_at" TIMESTAMP(3) NOT NULL,
  "used_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "email_verification_tokens_user_id_fkey"
    FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "email_verification_tokens_token_hash_key"
  ON "email_verification_tokens"("token_hash");

CREATE INDEX IF NOT EXISTS "email_verification_tokens_user_id_idx"
  ON "email_verification_tokens"("user_id");

CREATE INDEX IF NOT EXISTS "email_verification_tokens_expires_at_idx"
  ON "email_verification_tokens"("expires_at");
