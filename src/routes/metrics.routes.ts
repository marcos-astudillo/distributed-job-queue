import { FastifyInstance } from "fastify";
import { getMetrics } from "../controllers/metrics.controller";

export async function metricsRoutes(fastify: FastifyInstance) {
  fastify.get("/v1/metrics", getMetrics);
}
