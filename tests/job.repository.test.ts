import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { JobRepository } from "../src/repositories/job.repository";
import { prisma } from "../src/config/prisma";

const jobRepo = new JobRepository();

describe("JobRepository", () => {
  let jobId: string;

  afterAll(async () => {
    await prisma.job.deleteMany({});
  });

  it("should create a job", async () => {
    const job = await jobRepo.createJob({
      type: "send_email",
      payload: { to: "test@test.com" },
    });
    jobId = job.job_id;

    expect(job).toHaveProperty("job_id");
    expect(job.state).toBe("queued");
    expect(job.attempts).toBe(0);
  });

  it("should get job by id", async () => {
    const job = await jobRepo.getJobById(jobId);
    expect(job?.job_id).toBe(jobId);
  });

  it("should increment attempts", async () => {
    const job = await jobRepo.incrementAttempts(jobId);
    expect(job.attempts).toBe(1);
  });

  it("should mark job as succeeded", async () => {
    const job = await jobRepo.markSucceeded(jobId);
    expect(job.state).toBe("succeeded");
  });
});
