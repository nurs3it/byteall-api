-- CreateEnum
CREATE TYPE "VacancyStatus" AS ENUM ('draft', 'published', 'closed');

-- CreateEnum
CREATE TYPE "ApplicationStatus" AS ENUM ('new', 'reviewing', 'interview', 'offered', 'rejected', 'hired');

-- CreateTable
CREATE TABLE "vacancies" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "department" TEXT NOT NULL,
    "location" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'Full-time',
    "description" TEXT NOT NULL,
    "about" TEXT NOT NULL DEFAULT '',
    "responsibilities" TEXT[],
    "requirements" TEXT[],
    "nice_to_have" TEXT[],
    "status" "VacancyStatus" NOT NULL DEFAULT 'draft',
    "is_new" BOOLEAN NOT NULL DEFAULT true,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "published_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "vacancies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "applications" (
    "id" TEXT NOT NULL,
    "vacancy_id" TEXT,
    "first_name" TEXT NOT NULL,
    "last_name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "cover_letter" TEXT,
    "resume_url" TEXT,
    "status" "ApplicationStatus" NOT NULL DEFAULT 'new',
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "applications_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "vacancies_slug_key" ON "vacancies"("slug");

-- CreateIndex
CREATE INDEX "vacancies_status_idx" ON "vacancies"("status");

-- CreateIndex
CREATE INDEX "applications_vacancy_id_idx" ON "applications"("vacancy_id");

-- CreateIndex
CREATE INDEX "applications_status_idx" ON "applications"("status");

-- CreateIndex
CREATE INDEX "applications_created_at_idx" ON "applications"("created_at");

-- AddForeignKey
ALTER TABLE "applications" ADD CONSTRAINT "applications_vacancy_id_fkey" FOREIGN KEY ("vacancy_id") REFERENCES "vacancies"("id") ON DELETE SET NULL ON UPDATE CASCADE;
