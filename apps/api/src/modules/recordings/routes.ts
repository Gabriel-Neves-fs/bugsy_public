import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";

import type { AccessTokenVerifier } from "../auth/types.js";
import type { RecordingRepository } from "./types.js";

const MAX_VIDEO_SIZE = 100 * 1024 * 1024;
const MAX_TITLE_LENGTH = 120;
const MAX_DESCRIPTION_LENGTH = 1_000;
const ALLOWED_VIDEO_TYPES = new Set(["video/webm"]);

type RecordingRoutesOptions = {
  recordingRepository: RecordingRepository;
  accessTokenVerifier: AccessTokenVerifier;
};

type PublicRecordingParams = {
  publicId: string;
};

type UpdateRecordingBody = {
  title?: unknown;
  description?: unknown;
};

export async function registerRecordingRoutes(app: FastifyInstance, options: RecordingRoutesOptions) {
  app.get("/recordings", async (request, reply) => {
    const userId = await authenticateRequest(request, reply, options, "recordings:read");

    if (!userId) {
      return;
    }

    const recordings = await options.recordingRepository.listRecordings(userId);

    return {
      recordings,
    };
  });

  app.get<{ Params: PublicRecordingParams }>("/recordings/:publicId", async (request, reply) => {
    const publicId = request.params.publicId.trim();

    if (!publicId) {
      return reply.code(400).send({
        error: "public_id_required",
        message: "A public recording id is required.",
      });
    }

    const recording = await options.recordingRepository.findRecordingByPublicId(publicId);

    if (!recording) {
      return reply.code(404).send({
        error: "recording_not_found",
        message: "Recording not found.",
      });
    }

    return {
      recording,
    };
  });

  app.patch<{ Params: PublicRecordingParams; Body: UpdateRecordingBody }>(
    "/recordings/:publicId",
    async (request, reply) => {
      const userId = await authenticateRequest(request, reply, options, "recordings:write");

      if (!userId) {
        return;
      }

      const input = parseUpdateRecordingBody(request.body);

      if (!input.ok) {
        return reply.code(400).send({
          error: "invalid_recording_data",
          message: input.message,
        });
      }

      const recording = await options.recordingRepository.updateRecordingByPublicId(
        request.params.publicId.trim(),
        userId,
        input.value,
      );

      if (!recording) {
        return reply.code(404).send({
          error: "recording_not_found",
          message: "Recording not found.",
        });
      }

      return {
        recording,
      };
    },
  );

  app.delete<{ Params: PublicRecordingParams }>("/recordings/:publicId", async (request, reply) => {
    const userId = await authenticateRequest(request, reply, options, "recordings:write");

    if (!userId) {
      return;
    }

    const deleted = await options.recordingRepository.deleteRecordingByPublicId(
      request.params.publicId.trim(),
      userId,
    );

    if (!deleted) {
      return reply.code(404).send({
        error: "recording_not_found",
        message: "Recording not found.",
      });
    }

    return reply.code(204).send();
  });

  app.post("/recordings/upload", async (request, reply) => {
    const userId = await authenticateRequest(request, reply, options, "recordings:write");

    if (!userId) {
      return;
    }

    if (!request.isMultipart()) {
      return reply.code(415).send({
        error: "multipart_required",
        message: "Use multipart/form-data with a video file.",
      });
    }

    const file = await request.file();

    if (!file) {
      return reply.code(400).send({
        error: "video_required",
        message: "A video file is required.",
      });
    }

    if (!ALLOWED_VIDEO_TYPES.has(file.mimetype)) {
      return reply.code(415).send({
        error: "unsupported_video_type",
        message: "Only video/webm files are supported for now.",
      });
    }

    const buffer = await file.toBuffer();

    if (buffer.length > MAX_VIDEO_SIZE) {
      return reply.code(413).send({
        error: "video_too_large",
        message: "The video must be 100MB or smaller.",
      });
    }

    const recording = await options.recordingRepository.createRecording({
      userId,
      title: getFieldValue(file.fields.title) ?? "Untitled recording",
      description: getFieldValue(file.fields.description) ?? null,
      sourceUrl: getFieldValue(file.fields.sourceUrl) ?? null,
      duration: parseOptionalNumber(getFieldValue(file.fields.duration)),
      file: {
        buffer,
        fileName: file.filename,
        mimeType: file.mimetype,
        size: buffer.length,
      },
    });

    return reply.code(201).send({
      recording,
    });
  });
}

async function authenticateRequest(
  request: FastifyRequest,
  reply: FastifyReply,
  options: RecordingRoutesOptions,
  requiredScope: string,
) {
  const authorization = request.headers.authorization;
  const token = authorization?.startsWith("Bearer ") ? authorization.slice(7).trim() : "";
  const userId = await options.accessTokenVerifier(token, requiredScope);

  if (!userId) {
    await reply.code(401).send({
      error: "unauthorized",
      message: "A valid Bugsy access token is required.",
    });
    return undefined;
  }

  return userId;
}

function getFieldValue(field: unknown) {
  if (!isMultipartField(field)) {
    return undefined;
  }

  if (typeof field.value !== "string") {
    return undefined;
  }

  const value = field.value.trim();

  return value.length > 0 ? value : undefined;
}

function isMultipartField(field: unknown): field is { value: unknown } {
  return Boolean(field && typeof field === "object" && "value" in field);
}

function parseOptionalNumber(value: string | undefined) {
  if (!value) {
    return null;
  }

  const parsed = Number(value);

  return Number.isFinite(parsed) ? parsed : null;
}

function parseUpdateRecordingBody(body: UpdateRecordingBody | undefined) {
  if (!body || typeof body.title !== "string") {
    return {
      ok: false as const,
      message: "A title is required.",
    };
  }

  const title = body.title.trim();

  if (!title || title.length > MAX_TITLE_LENGTH) {
    return {
      ok: false as const,
      message: `The title must contain between 1 and ${MAX_TITLE_LENGTH} characters.`,
    };
  }

  if (body.description !== null && typeof body.description !== "string") {
    return {
      ok: false as const,
      message: "The description must be text or null.",
    };
  }

  const description = body.description?.trim() || null;

  if (description && description.length > MAX_DESCRIPTION_LENGTH) {
    return {
      ok: false as const,
      message: `The description must contain at most ${MAX_DESCRIPTION_LENGTH} characters.`,
    };
  }

  return {
    ok: true as const,
    value: {
      title,
      description,
    },
  };
}
