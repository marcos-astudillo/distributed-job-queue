import dotenv from "dotenv";

dotenv.config();

function parseRedisConfig() {
  if (process.env.REDIS_URL) {
    const url = new URL(process.env.REDIS_URL);
    return {
      url: process.env.REDIS_URL,
      host: url.hostname,
      port: Number(url.port) || 6379,
      password: url.password || undefined,
    };
  }
  return {
    url: undefined,
    host: process.env.REDIS_HOST || "localhost",
    port: Number(process.env.REDIS_PORT) || 6379,
    password: undefined,
  };
}

export const config = {
  port: process.env.PORT || 3000,

  postgres: {
    host: process.env.POSTGRES_HOST!,
    port: Number(process.env.POSTGRES_PORT),
    db: process.env.POSTGRES_DB!,
    user: process.env.POSTGRES_USER!,
    password: process.env.POSTGRES_PASSWORD!,
  },

  redis: parseRedisConfig(),

  features: {
    dlq: process.env.FEATURE_DLQ === "true",
    retries: process.env.FEATURE_RETRIES === "true",
    rateLimit: process.env.RATE_LIMIT_ENABLED === "true",
  },
};
