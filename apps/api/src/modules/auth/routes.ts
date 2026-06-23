import { timingSafeEqual } from "node:crypto";

import type { FastifyInstance } from "fastify";

import type { GoogleUserInput, UserRepository } from "./types.js";

type AuthRoutesOptions = {
  userRepository: UserRepository;
  internalApiKey?: string;
};

export async function registerAuthRoutes(app: FastifyInstance, options: AuthRoutesOptions) {
  app.post<{ Body: Partial<GoogleUserInput> }>("/auth/google-user", async (request, reply) => {
    const providedKey = request.headers["x-bugsy-internal-key"];

    if (
      typeof providedKey !== "string" ||
      !options.internalApiKey ||
      !hasEqualValue(providedKey, options.internalApiKey)
    ) {
      return reply.code(401).send({
        error: "unauthorized",
        message: "Invalid internal API key.",
      });
    }

    const input = parseGoogleUser(request.body);

    if (!input) {
      return reply.code(400).send({
        error: "invalid_google_user",
        message: "Google subject and email are required.",
      });
    }

    const user = await options.userRepository.upsertGoogleUser(input);

    return {
      user,
    };
  });
}

function parseGoogleUser(body: Partial<GoogleUserInput> | undefined): GoogleUserInput | null {
  if (!body) {
    return null;
  }

  const googleSubject = body.googleSubject?.trim();
  const email = body.email?.trim().toLowerCase();

  if (!googleSubject || !email) {
    return null;
  }

  return {
    googleSubject,
    email,
    name: normalizeOptionalText(body.name),
    image: normalizeOptionalText(body.image),
  };
}

function normalizeOptionalText(value: string | null | undefined) {
  const normalized = value?.trim();
  return normalized || null;
}

function hasEqualValue(left: string, right: string) {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);

  return leftBuffer.length === rightBuffer.length && timingSafeEqual(leftBuffer, rightBuffer);
}
