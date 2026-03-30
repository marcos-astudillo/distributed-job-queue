import { FastifyRequest, FastifyReply } from "fastify";
import { CreateJobRequest } from "../models/job.model";
import { JobRepository } from "../repositories/job.repository";
import { QueueRepository } from "../repositories/queue.repository";

const jobRepo = new JobRepository();
const queueRepo = new QueueRepository();

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

  const jobs = await Promise.all(
    jobIds.map(async (jobId) => {
      const job = await jobRepo.getJobById(jobId);
      if (!job) return null;
      return {
        job_id: job.job_id,
        type: job.type,
        payload: job.payload,
        visibility_timeout_sec: 30,
      };
    }),
  );

  // Filtramos nulls
  return { jobs: jobs.filter(Boolean) };
};

export const ackJob = async (
  request: FastifyRequest<{ Params: { jobId: string } }>,
  reply: FastifyReply,
) => {
  return { status: "acknowledged" };
};

export const nackJob = async (
  request: FastifyRequest<{ Params: { jobId: string } }>,
  reply: FastifyReply,
) => {
  return { status: "nacknowledged" };
};
