import { FastifyRequest, FastifyReply } from "fastify";
import { CreateJobRequest } from "../models/job.model";
import { JobRepository } from "../repositories/job.repository";

const jobRepo = new JobRepository();

export const createJob = async (
  request: FastifyRequest<{ Body: CreateJobRequest }>,
  reply: FastifyReply,
) => {
  const job = await jobRepo.createJob(request.body);

  return reply.code(201).send(job);
};

export const leaseJobs = async (
  request: FastifyRequest,
  reply: FastifyReply,
) => {
  // TODO: conectar con queue
  return {
    jobs: [],
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
