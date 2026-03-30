import { FastifyRequest, FastifyReply } from "fastify";
import { CreateJobRequest } from "../models/job.model";

export const createJob = async (
  request: FastifyRequest<{ Body: CreateJobRequest }>,
  reply: FastifyReply,
) => {
  const body = request.body;

  // TODO: conectar con service
  return reply.code(201).send({
    job_id: "mock_job_id",
    ...body,
  });
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
