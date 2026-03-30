import { FastifyInstance } from "fastify";
import {
  createJob,
  leaseJobs,
  ackJob,
  nackJob,
} from "../controllers/job.controller";

export async function jobRoutes(app: FastifyInstance) {
  app.post("/v1/jobs", {
    schema: {
      body: {
        type: "object",
        required: ["type", "payload"],
        properties: {
          type: { type: "string" },
          payload: { type: "object" },
          run_at: { type: "string", format: "date-time" },
          max_attempts: { type: "number", minimum: 1 },
        },
      },
    },
    handler: createJob,
  });

  app.post("/v1/jobs/lease", {
    schema: {
      querystring: {
        type: "object",
        properties: {
          worker_id: { type: "string" },
          limit: { type: "number", default: 10 },
        },
      },
    },
    handler: leaseJobs,
  });

  app.post("/v1/jobs/:jobId/ack", {
    handler: ackJob,
  });

  app.post("/v1/jobs/:jobId/nack", {
    handler: nackJob,
  });
}
