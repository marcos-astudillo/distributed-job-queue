import Fastify from "fastify";
import { config } from "./config/env";
import { jobRoutes } from "./routes/job.routes";

const app = Fastify({
  logger: true,
});

app.register(jobRoutes);

app.get("/health", async () => {
  return { status: "ok" };
});

const start = async () => {
  try {
    await app.listen({ port: Number(config.port), host: "0.0.0.0" });
    console.log(`Server running on port ${config.port}`);
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
};

start();
