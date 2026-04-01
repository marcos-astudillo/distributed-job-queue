import Redis from "ioredis";
import { config } from "./env";

export const redis = config.redis.url
  ? new Redis(config.redis.url)
  : new Redis({
      host: config.redis.host,
      port: config.redis.port,
      password: config.redis.password,
    });
