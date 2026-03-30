import { describe, it, expect } from "vitest";
import { JobRepository } from "../src/repositories/job.repository";
import { QueueRepository } from "../src/repositories/queue.repository";
import { VisibilityRepository } from "../src/repositories/visibility.repository";

const jobRepo = new JobRepository();
const queueRepo = new QueueRepository();
const visibilityRepo = new VisibilityRepository();

describe("Job Flow Integration", () => {
  it("should create, lease, ack a job", async () => {
    const job = await jobRepo.createJob({
      type: "send_email",
      payload: { to: "flow@test.com" },
    });

    await queueRepo.enqueue(job.job_id);
    const leased = await queueRepo.leaseJobs(1);
    expect(leased[0]).toBe(job.job_id);

    await visibilityRepo.markInProgress(job.job_id, 10);
    await jobRepo.markSucceeded(job.job_id);

    const updated = await jobRepo.getJobById(job.job_id);
    expect(updated?.state).toBe("succeeded");
  });
});
