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
        tags: ["Jobs"],
        summary: "Create a job",
        description:
          "Enqueues a new job for asynchronous processing. If `run_at` is provided, the job will not become available to workers until that time (delayed job). Otherwise it is queued immediately.",
        body: {
          type: "object",
          required: ["type", "payload"],
          properties: {
            type: {
              type: "string",
              description:
                "Logical job type. Workers use this to route to the correct handler.",
              example: "send_email",
            },
            payload: {
              type: "object",
              description: "Arbitrary JSON data that the worker will receive.",
              example: { to: "user@example.com", subject: "Welcome!" },
            },
            run_at: {
              type: "string",
              format: "date-time",
              description:
                "ISO 8601 timestamp for delayed execution. Omit to run immediately.",
              example: "2026-04-01T18:00:00Z",
            },
            max_attempts: {
              type: "integer",
              minimum: 1,
              maximum: 10,
              default: 3,
              description:
                "Maximum number of processing attempts before the job is moved to the DLQ.",
              example: 3,
            },
          },
        },
        response: {
          201: {
            description: "Job created and enqueued successfully. Initial state is `queued`.",
            $ref: "#/components/schemas/Job",
          },
          400: {
            description: "Invalid request body",
            $ref: "#/components/schemas/Error",
          },
        },
      },
    },
    createJob,
  );

  app.post("/v1/jobs/lease", {
    schema: {
      tags: ["Jobs"],
      summary: "Lease jobs",
      description:
        "Atomically claims up to `limit` jobs from the ready queue and marks them as `IN_PROGRESS`. Each leased job has a **visibility timeout of 30 seconds** — if the worker does not call `/ack` or `/nack` within that window, the job becomes visible again for another worker to claim.",
      querystring: {
        type: "object",
        properties: {
          worker_id: {
            type: "string",
            description: "Optional identifier for the calling worker (for logging/tracing).",
            example: "worker_42",
          },
          limit: {
            type: "integer",
            minimum: 1,
            maximum: 100,
            default: 10,
            description: "Maximum number of jobs to lease in this request.",
            example: 5,
          },
        },
      },
      response: {
        200: {
          description: "List of leased jobs. Empty array means the queue is idle.",
          type: "object",
          properties: {
            jobs: {
              type: "array",
              items: { $ref: "#/components/schemas/LeasedJob" },
            },
          },
        },
      },
    },
    handler: leaseJobs,
  });

  app.post("/v1/jobs/:jobId/ack", {
    schema: {
      tags: ["Jobs"],
      summary: "Acknowledge a job (success)",
      description:
        "Marks a previously leased job as `SUCCEEDED`. Call this after the worker has finished processing successfully. The job is removed from the in-progress set.",
      params: {
        type: "object",
        required: ["jobId"],
        properties: {
          jobId: {
            type: "string",
            format: "uuid",
            description: "ID of the job to acknowledge.",
            example: "550e8400-e29b-41d4-a716-446655440000",
          },
        },
      },
      response: {
        200: {
          description: "Job successfully acknowledged",
          type: "object",
          properties: {
            status: {
              type: "string",
              enum: ["acknowledged"],
              example: "acknowledged",
            },
          },
        },
        404: {
          description: "Job not found",
          $ref: "#/components/schemas/Error",
        },
      },
    },
    handler: ackJob,
  });

  app.post("/v1/jobs/:jobId/nack", {
    schema: {
      tags: ["Jobs"],
      summary: "Nack a job (failure)",
      description:
        "Reports that the worker failed to process the job. The job's attempt counter is incremented. If `attempts < max_attempts` the job is re-enqueued with **exponential backoff** (`2^attempts` seconds). Once `attempts >= max_attempts` the job is moved to the **Dead Letter Queue (DLQ)** and marked as `FAILED`.",
      params: {
        type: "object",
        required: ["jobId"],
        properties: {
          jobId: {
            type: "string",
            format: "uuid",
            description: "ID of the job to nack.",
            example: "550e8400-e29b-41d4-a716-446655440000",
          },
        },
      },
      response: {
        200: {
          description:
            "Job was either re-queued with a delay or moved to the DLQ.",
          type: "object",
          properties: {
            status: {
              type: "string",
              enum: ["requeued", "moved_to_dlq"],
              example: "requeued",
            },
            delaySeconds: {
              type: "integer",
              nullable: true,
              description:
                "Backoff delay in seconds before the job becomes visible again. Only present when `status` is `requeued`.",
              example: 4,
            },
          },
        },
        404: {
          description: "Job not found",
          $ref: "#/components/schemas/Error",
        },
      },
    },
    handler: nackJob,
  });
}
