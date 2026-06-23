import type { PrismaClient } from "../../generated/prisma/client.js";
import { getPrismaClient } from "../../lib/prisma.js";
import type { UserRepository } from "./types.js";

export function createPrismaUserRepository(prisma?: PrismaClient): UserRepository {
  return {
    async upsertGoogleUser(input) {
      const prismaClient = prisma ?? getPrismaClient();
      const user = await prismaClient.user.upsert({
        where: {
          googleSubject: input.googleSubject,
        },
        create: input,
        update: {
          email: input.email,
          name: input.name,
          image: input.image,
        },
      });

      return {
        id: user.id,
        email: user.email,
        name: user.name,
        image: user.image,
      };
    },
  };
}
