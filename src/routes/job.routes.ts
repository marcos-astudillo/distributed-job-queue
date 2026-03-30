import { FastifyInstance } from "fastify";
import {
  createJob,
  leaseJobs,
  ackJob,
  nackJob,
} from "../controllers/job.controller";

export async function jobRoutes(app: FastifyInstance) {
  app.post(
    "/v1/jobs",
    {
      schema: {
        description: "Crea un job en la cola",
        body: {
          type: "object",
          required: ["type", "payload"],
          properties: {
            type: { type: "string" },
            payload: { type: "object" },
            run_at: { type: "string", format: "date-time" },
            max_attempts: { type: "integer" },
          },
        },
        response: {
          201: {
            type: "object",
            properties: {
              job_id: { type: "string" },
              type: { type: "string" },
              payload: { type: "object" },
              state: { type: "string" },
              attempts: { type: "integer" },
              max_attempts: { type: "integer" },
              created_at: { type: "string" },
              updated_at: { type: "string" },
            },
          },
        },
      },
    },
    createJob,
  );

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
