import Fastify from "fastify";
import multipart from "@fastify/multipart";

import { createAccessTokenVerifier } from "./modules/auth/access-token.js";
import { createPrismaUserRepository } from "./modules/auth/prisma-user-repository.js";
import { registerAuthRoutes } from "./modules/auth/routes.js";
import type { AccessTokenVerifier, UserRepository } from "./modules/auth/types.js";
import { registerRecordingRoutes } from "./modules/recordings/routes.js";
import { createSupabaseRecordingRepository } from "./modules/recordings/supabase-recording-repository.js";
import type { RecordingRepository } from "./modules/recordings/types.js";

type BuildAppOptions = {
  recordingRepository?: RecordingRepository;
  userRepository?: UserRepository;
  accessTokenVerifier?: AccessTokenVerifier;
  internalApiKey?: string;
};

export function buildApp(options: BuildAppOptions = {}) {
  const app = Fastify({
    logger: true,
  });

  void app.register(multipart, {
    limits: {
      files: 1,
      fileSize: 100 * 1024 * 1024,
    },
  });

  app.get("/health", async () => {
    return {
      status: "ok",
      service: "bugsy-api",
    };
  });

  void app.register(registerAuthRoutes, {
    userRepository: options.userRepository ?? createPrismaUserRepository(),
    internalApiKey: options.internalApiKey ?? process.env.BUGSY_INTERNAL_API_KEY,
  });

  void app.register(registerRecordingRoutes, {
    recordingRepository: options.recordingRepository ?? createSupabaseRecordingRepository(),
    accessTokenVerifier: options.accessTokenVerifier ?? createAccessTokenVerifier(),
  });

  return app;
}
