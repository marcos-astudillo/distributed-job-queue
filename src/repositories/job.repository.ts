import { prisma } from "../config/prisma";
import { CreateJobRequest } from "../models/job.model";

export class JobRepository {
  async createJob(data: CreateJobRequest) {
    return prisma.job.create({
      data: {
        type: data.type,
        payload: data.payload,
        run_at: data.run_at ? new Date(data.run_at) : new Date(),
        max_attempts: data.max_attempts ?? 3,
      },
    });
  }

  async getQueuedJobs(limit: number) {
    return prisma.job.findMany({
      where: {
        state: "queued",
        run_at: {
          lte: new Date(),
        },
      },
      orderBy: {
        run_at: "asc",
      },
      take: limit,
    });
  }

  async getJobById(jobId: string) {
    return prisma.job.findUnique({ where: { job_id: jobId } });
  }
}
