import { redis } from "../config/redis";

const READY_QUEUE = "queue:ready";
const DELAYED_QUEUE = "queue:delayed";
const DLQ = "queue:dlq";

export class QueueRepository {
  async enqueue(jobId: string, delaySeconds = 0) {
    if (delaySeconds > 0) {
      const score = Date.now() + delaySeconds * 1000;
      await redis.zadd(DELAYED_QUEUE, score, jobId);
    } else {
      await redis.lpush(READY_QUEUE, jobId);
    }
  }

  async moveDelayedToReady() {
    const now = Date.now();
    const jobs = await redis.zrangebyscore(DELAYED_QUEUE, 0, now);

    if (jobs.length) {
      const pipeline = redis.pipeline();
      jobs.forEach((jobId) => {
        pipeline.lpush(READY_QUEUE, jobId);
        pipeline.zrem(DELAYED_QUEUE, jobId);
      });
      await pipeline.exec();
    }
  }

  async leaseJobs(limit: number) {
    const jobs: string[] = [];
    for (let i = 0; i < limit; i++) {
      const jobId = await redis.rpop(READY_QUEUE);
      if (!jobId) break;
      jobs.push(jobId);
    }
    return jobs;
  }

  async addToDLQ(jobId: string) {
    await redis.lpush(DLQ, jobId);
  }
}
