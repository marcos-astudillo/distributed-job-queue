import dotenv from "dotenv";

dotenv.config();

export const config = {
  port: process.env.PORT || 3000,

  postgres: {
    host: process.env.POSTGRES_HOST!,
    port: Number(process.env.POSTGRES_PORT),
    db: process.env.POSTGRES_DB!,
    user: process.env.POSTGRES_USER!,
    password: process.env.POSTGRES_PASSWORD!,
  },

  redis: {
    host: process.env.REDIS_HOST!,
    port: Number(process.env.REDIS_PORT),
  },

  features: {
    dlq: process.env.FEATURE_DLQ === "true",
    retries: process.env.FEATURE_RETRIES === "true",
    rateLimit: process.env.RATE_LIMIT_ENABLED === "true",
  },
};
