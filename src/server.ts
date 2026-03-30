import * as dotenv from "dotenv";
dotenv.config();

import Fastify from "fastify";
import { config } from "./config/env";
import { jobRoutes } from "./routes/job.routes";
import { prisma } from "./config/prisma";
import { VisibilityRepository } from "./repositories/visibility.repository";
import { metricsRoutes } from "./routes/metrics.routes";
import { fastifySwagger } from "fastify-swagger";

  
const visibilityRepo = new VisibilityRepository();  
const app = Fastify({ logger: true });
app.register(jobRoutes);
app.register(metricsRoutes);

app.get("/health", async () => ({ status: "ok" }));

app.register(fastifySwagger, {
  routePrefix: "/docs",
  swagger: {
    info: {
      title: "Distributed Job Queue API",
      description: "API para manejo de jobs en cola distribuida",
      version: "1.0.0",
    },
    consumes: ["application/json"],
    produces: ["application/json"],
  },
  exposeRoute: true,
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
