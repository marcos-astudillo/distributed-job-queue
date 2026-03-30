import { FastifyRequest, FastifyReply } from "fastify";
import { CreateJobRequest } from "../models/job.model";
import { JobRepository } from "../repositories/job.repository";
import { QueueRepository } from "../repositories/queue.repository";
import { VisibilityRepository } from "../repositories/visibility.repository";

const jobRepo = new JobRepository();
const queueRepo = new QueueRepository();
const visibilityRepo = new VisibilityRepository();

interface JobParams {
  jobId: string;
}

export const createJob = async (
  request: FastifyRequest<{ Body: CreateJobRequest }>,
  reply: FastifyReply,
) => {
  const job = await jobRepo.createJob(request.body);

  const delaySeconds = job.run_at
    ? (new Date(job.run_at).getTime() - Date.now()) / 1000
    : 0;

  await queueRepo.enqueue(job.job_id, Math.max(delaySeconds, 0));
  return reply.code(201).send(job);
};

export const leaseJobs = async (
  request: FastifyRequest,
  reply: FastifyReply,
) => {
  const { limit = 10 } = request.query as any;

  await queueRepo.moveDelayedToReady();

  const jobIds = await queueRepo.leaseJobs(limit);

  const visibilityTimeoutSec = 30;
    for (const jobId of jobIds) {
      await visibilityRepo.markInProgress(jobId, visibilityTimeoutSec);
  }

  const jobs = await Promise.all(
    jobIds.map(async (jobId) => {
      const job = await jobRepo.getJobById(jobId);
      if (!job) return null;
      return {
        job_id: job.job_id,
        type: job.type,
        payload: job.payload,
        visibility_timeout_sec: visibilityTimeoutSec,
      };
    }),
  );

  return { jobs: jobs.filter(Boolean) };
};

export const ackJob = async (
  request: FastifyRequest<{ Params: JobParams }>,
  reply: FastifyReply) => {
  const { jobId } = request.params;

  await jobRepo.markSucceeded(jobId);

  await queueRepo.removeFromReady(jobId);

  return { status: "acknowledged" };
};

export const nackJob = async (
  request: FastifyRequest<{ Params: JobParams }>,
  reply: FastifyReply,
) => {
  const { jobId } = request.params;

  const job = await jobRepo.incrementAttempts(jobId);

  if (job.attempts >= job.max_attempts) {
    await queueRepo.addToDLQ(jobId);
    await jobRepo.markFailed(jobId, "Max attempts reached");
    return { status: "moved_to_dlq" };
  } else {
    const delaySeconds = Math.pow(2, job.attempts);
    await queueRepo.enqueue(jobId, delaySeconds);
    return { status: "requeued", delaySeconds };
  }
};
