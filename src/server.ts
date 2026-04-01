import * as dotenv from "dotenv";
dotenv.config();

import Fastify from "fastify";
import { config } from "./config/env";
import { jobRoutes } from "./routes/job.routes";
import { prisma } from "./config/prisma";
import { VisibilityRepository } from "./repositories/visibility.repository";
import { metricsRoutes } from "./routes/metrics.routes";
import fastifySwagger from "@fastify/swagger";
import fastifySwaggerUI from "@fastify/swagger-ui";

  
const visibilityRepo = new VisibilityRepository();  
const app = Fastify({
  logger: true,
  ajv: {
    customOptions: {
      keywords: ["example"],
    },
  },
});
app.register(jobRoutes);
app.register(metricsRoutes);

app.get("/health", {
  schema: {
    tags: ["Health"],
    summary: "Liveness probe",
    description: "Returns 200 when the server is up. Use this endpoint for load balancer health checks.",
    response: {
      200: {
        type: "object",
        properties: {
          status: { type: "string", example: "ok" },
        },
      },
    },
  },
}, async () => ({ status: "ok" }));

app.register(fastifySwagger, {
  openapi: {
    openapi: "3.0.0",
    info: {
      title: "Distributed Job Queue API",
      description: `
## Overview
REST API for managing a distributed job queue backed by PostgreSQL and Redis.

Jobs move through the following lifecycle:

\`\`\`
PENDING → IN_PROGRESS → SUCCEEDED
                      ↘ FAILED (moved to DLQ after max_attempts)
\`\`\`

## Key concepts
- **Job**: Unit of work with a type, payload, and optional scheduled run time.
- **Lease**: A worker claims up to N jobs atomically. Each leased job has a visibility timeout (default 30 s); if not acked within that window it becomes available again.
- **Ack**: Worker reports success — job moves to \`SUCCEEDED\`.
- **Nack**: Worker reports failure — job is retried with exponential backoff or moved to the Dead Letter Queue (DLQ) after exhausting \`max_attempts\`.
- **DLQ**: Dead Letter Queue holding jobs that have exceeded their retry limit.
      `,
      version: "1.0.0",
    },
    tags: [
      {
        name: "Jobs",
        description: "Create, lease, acknowledge, and reject jobs",
      },
      {
        name: "Metrics",
        description: "Real-time queue depth and health metrics",
      },
      {
        name: "Health",
        description: "Service liveness probe",
      },
    ],
    components: {
      schemas: {
        Job: {
          type: "object",
          properties: {
            job_id: {
              type: "string",
              format: "uuid",
              description: "Unique identifier for the job",
              example: "550e8400-e29b-41d4-a716-446655440000",
            },
            type: {
              type: "string",
              description: "Job type used by workers to route processing logic",
              example: "send_email",
            },
            payload: {
              type: "object",
              description: "Arbitrary JSON data passed to the worker",
              example: { to: "user@example.com", subject: "Welcome!" },
            },
            state: {
              type: "string",
              enum: ["queued", "in_progress", "succeeded", "failed"],
              description: "Current lifecycle state of the job",
              example: "queued",
            },
            attempts: {
              type: "integer",
              description: "Number of processing attempts made so far",
              example: 0,
            },
            max_attempts: {
              type: "integer",
              description: "Maximum number of attempts before the job is moved to the DLQ",
              example: 3,
            },
            run_at: {
              type: "string",
              format: "date-time",
              nullable: true,
              description: "ISO 8601 timestamp for scheduled execution. Omit to run immediately.",
              example: "2026-04-01T18:00:00Z",
            },
            created_at: {
              type: "string",
              format: "date-time",
              description: "Timestamp when the job was created",
            },
            updated_at: {
              type: "string",
              format: "date-time",
              description: "Timestamp of the last state change",
            },
          },
        },
        LeasedJob: {
          type: "object",
          properties: {
            job_id: {
              type: "string",
              format: "uuid",
              example: "550e8400-e29b-41d4-a716-446655440000",
            },
            type: { type: "string", example: "send_email" },
            payload: {
              type: "object",
              example: { to: "user@example.com", subject: "Welcome!" },
            },
            visibility_timeout_sec: {
              type: "integer",
              description: "Seconds the worker has to ack/nack before the job becomes visible again",
              example: 30,
            },
          },
        },
        Error: {
          type: "object",
          properties: {
            error: { type: "string", example: "Job not found" },
          },
        },
      },
    },
  },
});

app.register(fastifySwaggerUI, {
  routePrefix: "/docs",
  uiConfig: {
    docExpansion: "list",
    deepLinking: true,
  },
});

setInterval(async () => {
  try {
    await visibilityRepo.requeueExpiredJobs();
  } catch (err) {
    console.error("Error requeueing expired jobs:", err);
  }
}, 5000);

const start = async () => {
  try {
    await app.listen({ port: Number(config.port), host: "0.0.0.0" });
    console.log(`Server running on port ${config.port}`);
  } catch (err) {
    app.log.error(err);
    await prisma.$disconnect();
    process.exit(1);
  }
};

start();
