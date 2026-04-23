-- AlterTable
ALTER TABLE "posts" ADD COLUMN     "excerpt" TEXT,
ADD COLUMN     "linkedin_post_id" TEXT;

-- CreateTable
CREATE TABLE "linkedin_tokens" (
    "id" TEXT NOT NULL DEFAULT 'singleton',
    "access_token" TEXT NOT NULL,
    "refresh_token" TEXT,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "organization_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "linkedin_tokens_pkey" PRIMARY KEY ("id")
);
