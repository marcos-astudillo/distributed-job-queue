import { FastifyInstance } from "fastify";
import { getMetrics } from "../controllers/metrics.controller";

export async function metricsRoutes(fastify: FastifyInstance) {
  fastify.get("/v1/metrics", {
    schema: {
      tags: ["Metrics"],
      summary: "Queue metrics",
      description:
        "Returns the current depth of each queue partition. Useful for monitoring dashboards and auto-scaling decisions.\n\n| Field | Description |\n|---|---|\n| `ready` | Jobs waiting to be leased |\n| `delayed` | Jobs scheduled for a future time |\n| `in_progress` | Jobs currently leased by a worker |\n| `dlq` | Jobs that exhausted all retry attempts |",
      response: {
        200: {
          description: "Current queue depths",
          type: "object",
          properties: {
            queue: {
              type: "object",
              properties: {
                ready: {
                  type: "integer",
                  description: "Number of jobs waiting to be leased",
                  example: 14,
                },
                delayed: {
                  type: "integer",
                  description: "Number of scheduled jobs not yet ready",
                  example: 3,
                },
                in_progress: {
                  type: "integer",
                  description: "Number of jobs currently leased by a worker",
                  example: 2,
                },
                dlq: {
                  type: "integer",
                  description: "Number of jobs in the Dead Letter Queue",
                  example: 1,
                },
              },
            },
          },
        },
        500: {
          description: "Failed to fetch metrics (Redis unavailable)",
          $ref: "#/components/schemas/Error",
        },
      },
    },
    handler: getMetrics,
  });
}
