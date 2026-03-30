-- CreateEnum
CREATE TYPE "JobState" AS ENUM ('queued', 'in_progress', 'succeeded', 'failed');

-- CreateTable
CREATE TABLE "Job" (
    "job_id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "state" "JobState" NOT NULL DEFAULT 'queued',
    "run_at" TIMESTAMP(3) NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "max_attempts" INTEGER NOT NULL DEFAULT 3,
    "last_error" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Job_pkey" PRIMARY KEY ("job_id")
);

-- CreateIndex
CREATE INDEX "Job_state_run_at_idx" ON "Job"("state", "run_at");
