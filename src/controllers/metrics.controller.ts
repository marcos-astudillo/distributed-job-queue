import { redis } from "../config/redis";
import { FastifyRequest, FastifyReply } from "fastify";

export const getMetrics = async (_request: FastifyRequest, reply: FastifyReply) => {
  try {
    const ready = await redis.llen("queue:ready");
    const delayed = await redis.zcard("queue:delayed");
    const inProgress = await redis.zcard("queue:in_progress");
    const dlq = await redis.llen("queue:dlq");

    return reply.send({
      queue: {
        ready,
        delayed,
        in_progress: inProgress,
        dlq,
      },
    });
  } catch (err) {
    console.error("Error getting metrics:", err);
    return reply.code(500).send({ error: "Could not fetch metrics" });
  }
};
