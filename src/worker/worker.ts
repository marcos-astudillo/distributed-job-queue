import { QueueRepository } from "../repositories/queue.repository";
import { JobRepository } from "../repositories/job.repository";
import { VisibilityRepository } from "../repositories/visibility.repository";

const queueRepo = new QueueRepository();
const jobRepo = new JobRepository();
const visibilityRepo = new VisibilityRepository();

const WORKER_ID = `worker_${Math.floor(Math.random() * 1000)}`;
const LEASE_LIMIT = 5;
const VISIBILITY_TIMEOUT_SEC = 30;

async function processJob(job: any) {
  console.log(`[${WORKER_ID}] Processing job ${job.job_id} type=${job.type}`);
  const success = Math.random() > 0.2;
  await new Promise((res) => setTimeout(res, Math.random() * 2000));
  return success;
}

async function workerLoop() {
  try {
    const leased = await leaseJobs();
    if (leased.length === 0) {
      await new Promise((res) => setTimeout(res, 1000));
      return;
    }

    for (const job of leased) {
      const success = await processJob(job);

      await visibilityRepo.removeFromInProgress(job.job_id);

      if (success) {
        await jobRepo.markSucceeded(job.job_id);
        console.log(`[${WORKER_ID}] Job ${job.job_id} succeeded`);
      } else {
        const updatedJob = await jobRepo.incrementAttempts(job.job_id);
        if (updatedJob.attempts >= updatedJob.max_attempts) {
          await queueRepo.addToDLQ(job.job_id);
          await jobRepo.markFailed(job.job_id, "Max attempts reached");
          console.log(`[${WORKER_ID}] Job ${job.job_id} moved to DLQ`);
        } else {
          const delaySeconds = Math.pow(2, updatedJob.attempts);
          await queueRepo.enqueue(job.job_id, delaySeconds);
          console.log(
            `[${WORKER_ID}] Job ${job.job_id} failed, requeued with delay ${delaySeconds}s`,
          );
        }
      }

      await visibilityRepo.requeueExpiredJobs();
    }
  } catch (err) {
    console.error(`[${WORKER_ID}] Error in worker loop:`, err);
  }
}

async function leaseJobs() {
  const jobIds = await queueRepo.leaseJobs(LEASE_LIMIT);

  const jobs = [];
  for (const jobId of jobIds) {
    await visibilityRepo.markInProgress(jobId, VISIBILITY_TIMEOUT_SEC);
    const job = await jobRepo.getJobById(jobId);
    if (job) jobs.push(job);
  }

  return jobs;
}

async function startWorker() {
  console.log(`[${WORKER_ID}] Worker started`);
  while (true) {
    await workerLoop();
  }
}

startWorker();
