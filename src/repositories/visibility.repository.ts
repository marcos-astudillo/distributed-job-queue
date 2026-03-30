import { redis } from "../config/redis";

export class VisibilityRepository {
  private IN_PROGRESS = "queue:in_progress";
  private READY = "queue:ready";

  async markInProgress(jobId: string, visibilityTimeoutSec: number) {
    const expireAt = Date.now() + visibilityTimeoutSec * 1000;
    await redis.zadd(this.IN_PROGRESS, expireAt, jobId);
  }

  async requeueExpiredJobs() {
    const now = Date.now();
    const expired = await redis.zrangebyscore(this.IN_PROGRESS, 0, now);

    if (expired.length === 0) return;

    const pipeline = redis.pipeline();
    expired.forEach((jobId) => {
      pipeline.lpush(this.READY, jobId);
      pipeline.zrem(this.IN_PROGRESS, jobId);
    });
    await pipeline.exec();
  }
}
