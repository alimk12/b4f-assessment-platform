-- Alpha: cities, cohorts, instructors per cohort, sessions, alerts (docs/PROJECT-STRUCTURE.md §17.2).
-- Generated with `prisma migrate diff`, then edited by hand: `tests.cohort_id` is added as NULL,
-- the existing rows are moved into one cohort, and only then the column becomes NOT NULL.

-- CreateEnum
CREATE TYPE "CohortStatus" AS ENUM ('ACTIVE', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "AlertSeverity" AS ENUM ('DANGER', 'WARNING');

-- CreateEnum
CREATE TYPE "AlertType" AS ENUM ('DEVICE_SWITCH', 'FULLSCREEN_EXIT', 'TAB_HIDDEN', 'COPY', 'CUT', 'PASTE_EXTERNAL', 'DROP_EXTERNAL', 'ATTEMPT_TERMINATED');

-- AlterEnum (the new values are not used inside this migration)
ALTER TYPE "Role" ADD VALUE 'ADMIN' BEFORE 'INSTRUCTOR';

-- AlterEnum
ALTER TYPE "ViolationType" ADD VALUE 'DEVICE_SWITCH';

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "cohort_id" INTEGER,
ADD COLUMN     "is_active" BOOLEAN NOT NULL DEFAULT true;

-- AlterTable (NOT NULL is added after the data move below)
ALTER TABLE "tests" ADD COLUMN     "cohort_id" INTEGER,
ADD COLUMN     "source_test_id" INTEGER;

-- CreateTable
CREATE TABLE "cities" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "cities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cohorts" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "city_id" INTEGER NOT NULL,
    "join_code" TEXT NOT NULL,
    "status" "CohortStatus" NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "archived_at" TIMESTAMP(3),

    CONSTRAINT "cohorts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cohort_instructors" (
    "cohort_id" INTEGER NOT NULL,
    "user_id" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "cohort_instructors_pkey" PRIMARY KEY ("cohort_id","user_id")
);

-- CreateTable
CREATE TABLE "user_sessions" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_seen_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revoked_at" TIMESTAMP(3),
    "revoke_reason" TEXT,

    CONSTRAINT "user_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "alerts" (
    "id" SERIAL NOT NULL,
    "cohort_id" INTEGER NOT NULL,
    "attempt_id" INTEGER NOT NULL,
    "student_id" INTEGER NOT NULL,
    "type" "AlertType" NOT NULL,
    "severity" "AlertSeverity" NOT NULL,
    "message" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "read_at" TIMESTAMP(3),
    "read_by_id" INTEGER,

    CONSTRAINT "alerts_pkey" PRIMARY KEY ("id")
);

-- ---------------------------------------------------------------------------
-- Data move: keep every existing test, student, instructor and attempt.
-- Runs only when the database already has data (a fresh database is filled by the seed).
-- Join code: 8 characters from md5 hex, upper-cased, with 0 → 2 and 1 → 3 (no 0/O/1/I).
-- ---------------------------------------------------------------------------
INSERT INTO "cities" ("name")
SELECT 'Salamiyah'
WHERE EXISTS (SELECT 1 FROM "tests") OR EXISTS (SELECT 1 FROM "users");

INSERT INTO "cohorts" ("name", "city_id", "join_code", "status")
SELECT 'Cohort 8', c."id", translate(upper(substr(md5(random()::text || clock_timestamp()::text), 1, 8)), '01', '23'), 'ACTIVE'
FROM "cities" c
WHERE c."name" = 'Salamiyah';

UPDATE "tests" SET "cohort_id" = (SELECT "id" FROM "cohorts" WHERE "name" = 'Cohort 8' LIMIT 1);

UPDATE "users" SET "cohort_id" = (SELECT "id" FROM "cohorts" WHERE "name" = 'Cohort 8' LIMIT 1)
WHERE "role" = 'STUDENT';

INSERT INTO "cohort_instructors" ("cohort_id", "user_id")
SELECT co."id", u."id"
FROM "cohorts" co CROSS JOIN "users" u
WHERE co."name" = 'Cohort 8' AND u."role" = 'INSTRUCTOR';

-- Now every test has a cohort.
ALTER TABLE "tests" ALTER COLUMN "cohort_id" SET NOT NULL;

-- DropIndex (order was unique for the whole platform; now it is unique per cohort)
DROP INDEX "tests_order_key";

-- CreateIndex
CREATE UNIQUE INDEX "cities_name_key" ON "cities"("name");

-- CreateIndex
CREATE UNIQUE INDEX "cohorts_join_code_key" ON "cohorts"("join_code");

-- CreateIndex
CREATE UNIQUE INDEX "cohorts_city_id_name_key" ON "cohorts"("city_id", "name");

-- CreateIndex
CREATE INDEX "user_sessions_user_id_revoked_at_idx" ON "user_sessions"("user_id", "revoked_at");

-- CreateIndex
CREATE INDEX "alerts_cohort_id_read_at_idx" ON "alerts"("cohort_id", "read_at");

-- CreateIndex
CREATE INDEX "alerts_cohort_id_created_at_idx" ON "alerts"("cohort_id", "created_at");

-- CreateIndex
CREATE INDEX "users_cohort_id_idx" ON "users"("cohort_id");

-- CreateIndex
CREATE UNIQUE INDEX "tests_cohort_id_order_key" ON "tests"("cohort_id", "order");

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_cohort_id_fkey" FOREIGN KEY ("cohort_id") REFERENCES "cohorts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tests" ADD CONSTRAINT "tests_cohort_id_fkey" FOREIGN KEY ("cohort_id") REFERENCES "cohorts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cohorts" ADD CONSTRAINT "cohorts_city_id_fkey" FOREIGN KEY ("city_id") REFERENCES "cities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cohort_instructors" ADD CONSTRAINT "cohort_instructors_cohort_id_fkey" FOREIGN KEY ("cohort_id") REFERENCES "cohorts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cohort_instructors" ADD CONSTRAINT "cohort_instructors_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_sessions" ADD CONSTRAINT "user_sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "alerts" ADD CONSTRAINT "alerts_cohort_id_fkey" FOREIGN KEY ("cohort_id") REFERENCES "cohorts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "alerts" ADD CONSTRAINT "alerts_attempt_id_fkey" FOREIGN KEY ("attempt_id") REFERENCES "attempts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "alerts" ADD CONSTRAINT "alerts_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "alerts" ADD CONSTRAINT "alerts_read_by_id_fkey" FOREIGN KEY ("read_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
