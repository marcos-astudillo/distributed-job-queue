import * as dotenv from "dotenv";

dotenv.config({ override: true });

import { PrismaClient } from "@prisma/client";

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL no está definido en .env. Prisma no puede inicializarse.",
  );
}

export const prisma = new PrismaClient();
