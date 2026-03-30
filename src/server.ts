import * as dotenv from "dotenv";
dotenv.config();

import Fastify from "fastify";
import { config } from "./config/env";
import { jobRoutes } from "./routes/job.routes";
import { prisma } from "./config/prisma";
import { VisibilityRepository } from "./repositories/visibility.repository";
  
const visibilityRepo = new VisibilityRepository();  
const app = Fastify({ logger: true });
app.register(jobRoutes);

app.get("/health", async () => ({ status: "ok" }));

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
