-- DropTable
DROP TABLE IF EXISTS "otp_codes";

-- DropEnum
DROP TYPE IF EXISTS "OtpType";

-- AlterTable: remove phone and is_verified from users
ALTER TABLE "users" DROP COLUMN IF EXISTS "phone";
ALTER TABLE "users" DROP COLUMN IF EXISTS "is_verified";

-- Make email required (NOT NULL)
ALTER TABLE "users" ALTER COLUMN "email" SET NOT NULL;
