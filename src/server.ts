import Fastify from "fastify";
import { config } from "./config/env";

const app = Fastify({
  logger: true, // usa pino internamente
});

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
