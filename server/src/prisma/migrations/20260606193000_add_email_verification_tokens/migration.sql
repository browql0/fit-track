-- AlterTable
ALTER TABLE "foods" ALTER COLUMN "is_public" SET DEFAULT false;

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "email_verification_expires" TIMESTAMP(3),
ADD COLUMN     "email_verification_token" VARCHAR(255),
ADD COLUMN     "email_verified" BOOLEAN NOT NULL DEFAULT false;
