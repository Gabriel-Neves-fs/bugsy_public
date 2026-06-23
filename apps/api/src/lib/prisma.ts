import { PrismaPg } from "@prisma/adapter-pg";

import "../env.js";
import { PrismaClient } from "../generated/prisma/client.js";

let prisma: PrismaClient | undefined;

export function getPrismaClient() {
  if (!process.env.DATABASE_URL) {
    throw new Error("Missing DATABASE_URL.");
  }

  prisma ??= new PrismaClient({
    adapter: new PrismaPg({
      connectionString: process.env.DATABASE_URL,
    }),
  });

  return prisma;
}
