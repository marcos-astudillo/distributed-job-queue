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
  await queueRepo.enqueue(job.job_id);
  return reply.code(201).send(job);
};

export const leaseJobs = async (
  request: FastifyRequest,
  reply: FastifyReply,
) => {
  const { limit = 10 } = request.query as any;

  await queueRepo.moveDelayedToReady();

  const jobIds = await queueRepo.leaseJobs(limit);

  return {
    jobs: jobIds.map((id) => ({ job_id: id, visibility_timeout_sec: 30 })),
  };
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
