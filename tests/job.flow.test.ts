import { describe, it, expect, beforeEach, afterAll } from "vitest";
import { JobRepository } from "../src/repositories/job.repository";
import { QueueRepository } from "../src/repositories/queue.repository";
import { VisibilityRepository } from "../src/repositories/visibility.repository";
import { prisma } from "../src/config/prisma";
import { redis } from "../src/config/redis";

const jobRepo = new JobRepository();
const queueRepo = new QueueRepository();
const visibilityRepo = new VisibilityRepository();

async function clearQueues() {
  await redis.del("queue:ready", "queue:delayed", "queue:in_progress", "queue:dlq");
}

beforeEach(async () => {
  await clearQueues();
});

afterAll(async () => {
  await clearQueues();
  await prisma.job.deleteMany({});
  await prisma.$disconnect();
  await redis.quit();
});

describe("Job Flow Integration", () => {
  it("create → lease → ack (success path)", async () => {
    const job = await jobRepo.createJob({
      type: "send_email",
      payload: { to: "flow@test.com" },
    });
    expect(job.state).toBe("queued");

    await queueRepo.enqueue(job.job_id);
    const leased = await queueRepo.leaseJobs(1);
    expect(leased[0]).toBe(job.job_id);

    await visibilityRepo.markInProgress(job.job_id, 30);
    const inProgressScore = await redis.zscore("queue:in_progress", job.job_id);
    expect(inProgressScore).not.toBeNull();

    await jobRepo.markSucceeded(job.job_id);
    await visibilityRepo.removeFromInProgress(job.job_id);

    const updated = await jobRepo.getJobById(job.job_id);
    expect(updated?.state).toBe("succeeded");

    const removedScore = await redis.zscore("queue:in_progress", job.job_id);
    expect(removedScore).toBeNull();
  });

  it("create → lease → nack → requeue with backoff", async () => {
    const job = await jobRepo.createJob({
      type: "resize_image",
      payload: { url: "https://example.com/img.png" },
      max_attempts: 3,
    });

    await queueRepo.enqueue(job.job_id);
    await queueRepo.leaseJobs(1);
    await visibilityRepo.markInProgress(job.job_id, 30);

    // nack: remove from in_progress, increment attempts, requeue with backoff
    await visibilityRepo.removeFromInProgress(job.job_id);
    const updated = await jobRepo.incrementAttempts(job.job_id);
    expect(updated.attempts).toBe(1);

    const delaySeconds = Math.pow(2, updated.attempts); // 2s
    await queueRepo.enqueue(job.job_id, delaySeconds);

    const removedScore = await redis.zscore("queue:in_progress", job.job_id);
    expect(removedScore).toBeNull();

    const delayedScore = await redis.zscore("queue:delayed", job.job_id);
    expect(delayedScore).not.toBeNull();
  });

  it("create → lease → nack until DLQ (max_attempts exhausted)", async () => {
    const job = await jobRepo.createJob({
      type: "send_webhook",
      payload: { url: "https://example.com/hook" },
      max_attempts: 2,
    });

    await queueRepo.enqueue(job.job_id);

    for (let attempt = 1; attempt <= 2; attempt++) {
      await queueRepo.leaseJobs(1);
      await visibilityRepo.markInProgress(job.job_id, 30);
      await visibilityRepo.removeFromInProgress(job.job_id);
      await jobRepo.incrementAttempts(job.job_id);
    }

    await queueRepo.addToDLQ(job.job_id);
    await jobRepo.markFailed(job.job_id, "Max attempts reached");

    const failed = await jobRepo.getJobById(job.job_id);
    expect(failed?.state).toBe("failed");
    expect(failed?.last_error).toBe("Max attempts reached");

    const dlqLen = await redis.llen("queue:dlq");
    expect(dlqLen).toBe(1);
  });

  it("visibility timeout re-enqueues a job not acked in time", async () => {
    const job = await jobRepo.createJob({
      type: "process_csv",
      payload: { file: "data.csv" },
    });

    await queueRepo.enqueue(job.job_id);
    await queueRepo.leaseJobs(1);

    // Simulate an already-expired visibility window (timeout in the past)
    const expiredAt = Date.now() - 1000;
    await redis.zadd("queue:in_progress", expiredAt, job.job_id);

    await visibilityRepo.requeueExpiredJobs();

    const readyLen = await redis.llen("queue:ready");
    expect(readyLen).toBe(1);

    const inProgressScore = await redis.zscore("queue:in_progress", job.job_id);
    expect(inProgressScore).toBeNull();
  });

  it("delayed job is not leased before run_at", async () => {
    const job = await jobRepo.createJob({
      type: "scheduled_report",
      payload: { reportId: "r1" },
    });

    // enqueue with 60s delay → goes to delayed queue, not ready
    await queueRepo.enqueue(job.job_id, 60);

    const readyLen = await redis.llen("queue:ready");
    expect(readyLen).toBe(0);

    const delayedScore = await redis.zscore("queue:delayed", job.job_id);
    expect(delayedScore).not.toBeNull();

    // moveDelayedToReady won't move it since score is in the future
    await queueRepo.moveDelayedToReady();
    expect(await redis.llen("queue:ready")).toBe(0);
  });
});
