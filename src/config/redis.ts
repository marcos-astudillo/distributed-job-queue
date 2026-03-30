import Redis from "ioredis";
import { config } from "./env";

export const redis = new Redis({
  host: config.redis.host,
  port: config.redis.port,
});
