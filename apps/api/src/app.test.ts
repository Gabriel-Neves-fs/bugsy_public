import { describe, expect, it } from "vitest";

import { buildApp } from "./app.js";
import type { RecordingRepository } from "./modules/recordings/types.js";

describe("GET /health", () => {
  it("returns API health status", async () => {
    const app = buildApp();

    const response = await app.inject({
      method: "GET",
      url: "/health",
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({
      status: "ok",
      service: "bugsy-api",
    });
  });
});

describe("POST /recordings/upload", () => {
  it("requires multipart form data", async () => {
    const app = buildApp({
      recordingRepository: createFakeRecordingRepository(),
      accessTokenVerifier: createFakeAccessTokenVerifier(),
    });

    const response = await app.inject({
      method: "POST",
      url: "/recordings/upload",
      payload: {
        title: "Bug",
      },
    });

    expect(response.statusCode).toBe(415);
    expect(response.json()).toEqual({
      error: "multipart_required",
      message: "Use multipart/form-data with a video file.",
    });
  });

  it("rejects unsupported file types", async () => {
    const app = buildApp({
      recordingRepository: createFakeRecordingRepository(),
      accessTokenVerifier: createFakeAccessTokenVerifier(),
    });
    const body = createMultipartBody({
      fileContent: "not a video",
      fileName: "recording.txt",
      mimeType: "text/plain",
    });

    const response = await app.inject({
      method: "POST",
      url: "/recordings/upload",
      headers: body.headers,
      payload: body.payload,
    });

    expect(response.statusCode).toBe(415);
    expect(response.json()).toEqual({
      error: "unsupported_video_type",
      message: "Only video/webm files are supported for now.",
    });
  });

  it("creates a recording from a webm upload", async () => {
    const app = buildApp({
      recordingRepository: createFakeRecordingRepository(),
      accessTokenVerifier: createFakeAccessTokenVerifier(),
    });
    const body = createMultipartBody({
      fileContent: "webm-content",
      fileName: "recording.webm",
      mimeType: "video/webm",
      fields: {
        title: "Checkout bug",
        description: "Payment button fails.",
        duration: "1234",
        sourceUrl: "https://example.com/checkout",
      },
    });

    const response = await app.inject({
      method: "POST",
      url: "/recordings/upload",
      headers: body.headers,
      payload: body.payload,
    });

    expect(response.statusCode).toBe(201);
    expect(response.json()).toEqual({
      recording: {
        id: "recording-id",
        publicId: "public-id",
        title: "Checkout bug",
        description: "Payment button fails.",
        videoUrl: "https://cdn.example.com/recording.webm",
        storagePath: "recordings/public-id.webm",
        duration: 1234,
        fileSize: 12,
        mimeType: "video/webm",
        sourceUrl: "https://example.com/checkout",
        createdAt: "2026-06-19T00:00:00.000Z",
      },
    });
  });
});

describe("GET /recordings/:publicId", () => {
  it("returns a public recording", async () => {
    const app = buildApp({
      recordingRepository: createFakeRecordingRepository(),
      accessTokenVerifier: createFakeAccessTokenVerifier(),
    });

    const response = await app.inject({
      method: "GET",
      url: "/recordings/public-id",
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({
      recording: createFakeRecording(),
    });
  });

  it("returns 404 when the recording does not exist", async () => {
    const app = buildApp({
      recordingRepository: createFakeRecordingRepository(),
      accessTokenVerifier: createFakeAccessTokenVerifier(),
    });

    const response = await app.inject({
      method: "GET",
      url: "/recordings/missing-id",
    });

    expect(response.statusCode).toBe(404);
    expect(response.json()).toEqual({
      error: "recording_not_found",
      message: "Recording not found.",
    });
  });
});

describe("GET /recordings", () => {
  it("returns the available recordings", async () => {
    const app = buildApp({
      recordingRepository: createFakeRecordingRepository(),
      accessTokenVerifier: createFakeAccessTokenVerifier(),
    });

    const response = await app.inject({
      method: "GET",
      url: "/recordings",
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({
      recordings: [createFakeRecording()],
    });
  });

  it("rejects requests without a valid access token", async () => {
    const app = buildApp({
      recordingRepository: createFakeRecordingRepository(),
      accessTokenVerifier: async () => null,
    });

    const response = await app.inject({
      method: "GET",
      url: "/recordings",
    });

    expect(response.statusCode).toBe(401);
    expect(response.json()).toEqual({
      error: "unauthorized",
      message: "A valid Bugsy access token is required.",
    });
  });

  it("filters recordings with the user id from the access token", async () => {
    let requestedUserId: string | undefined;
    const repository = createFakeRecordingRepository();
    repository.listRecordings = async (userId) => {
      requestedUserId = userId;
      return [];
    };
    const app = buildApp({
      recordingRepository: repository,
      accessTokenVerifier: async () => "authenticated-user-id",
    });

    const response = await app.inject({
      method: "GET",
      url: "/recordings",
    });

    expect(response.statusCode).toBe(200);
    expect(requestedUserId).toBe("authenticated-user-id");
  });
});

describe("POST /auth/google-user", () => {
  it("creates or updates an internal user for a trusted request", async () => {
    const app = buildApp({
      userRepository: {
        async upsertGoogleUser(input) {
          return {
            id: "user-id",
            email: input.email,
            name: input.name,
            image: input.image,
          };
        },
      },
      internalApiKey: "internal-test-key",
    });

    const response = await app.inject({
      method: "POST",
      url: "/auth/google-user",
      headers: {
        "x-bugsy-internal-key": "internal-test-key",
      },
      payload: {
        googleSubject: "google-subject",
        email: "USER@EXAMPLE.COM",
        name: "Bugsy User",
        image: null,
      },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({
      user: {
        id: "user-id",
        email: "user@example.com",
        name: "Bugsy User",
        image: null,
      },
    });
  });

  it("rejects requests with an invalid internal key", async () => {
    const app = buildApp({
      userRepository: {
        async upsertGoogleUser() {
          throw new Error("The repository must not be called.");
        },
      },
      internalApiKey: "internal-test-key",
    });

    const response = await app.inject({
      method: "POST",
      url: "/auth/google-user",
      headers: {
        "x-bugsy-internal-key": "wrong-key",
      },
      payload: {
        googleSubject: "google-subject",
        email: "user@example.com",
      },
    });

    expect(response.statusCode).toBe(401);
  });
});

describe("PATCH /recordings/:publicId", () => {
  it("updates the recording title and description", async () => {
    const app = buildApp({
      recordingRepository: createFakeRecordingRepository(),
      accessTokenVerifier: createFakeAccessTokenVerifier(),
    });

    const response = await app.inject({
      method: "PATCH",
      url: "/recordings/public-id",
      payload: {
        title: "Checkout corrigido",
        description: "Novo contexto da gravação.",
      },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({
      recording: {
        ...createFakeRecording(),
        title: "Checkout corrigido",
        description: "Novo contexto da gravação.",
      },
    });
  });

  it("rejects an empty title", async () => {
    const app = buildApp({
      recordingRepository: createFakeRecordingRepository(),
      accessTokenVerifier: createFakeAccessTokenVerifier(),
    });

    const response = await app.inject({
      method: "PATCH",
      url: "/recordings/public-id",
      payload: {
        title: "   ",
        description: null,
      },
    });

    expect(response.statusCode).toBe(400);
    expect(response.json()).toEqual({
      error: "invalid_recording_data",
      message: "The title must contain between 1 and 120 characters.",
    });
  });

  it("returns 404 when updating a missing recording", async () => {
    const app = buildApp({
      recordingRepository: createFakeRecordingRepository(),
      accessTokenVerifier: createFakeAccessTokenVerifier(),
    });

    const response = await app.inject({
      method: "PATCH",
      url: "/recordings/missing-id",
      payload: {
        title: "Checkout corrigido",
        description: null,
      },
    });

    expect(response.statusCode).toBe(404);
  });
});

describe("DELETE /recordings/:publicId", () => {
  it("deletes an existing recording", async () => {
    const app = buildApp({
      recordingRepository: createFakeRecordingRepository(),
      accessTokenVerifier: createFakeAccessTokenVerifier(),
    });

    const response = await app.inject({
      method: "DELETE",
      url: "/recordings/public-id",
    });

    expect(response.statusCode).toBe(204);
    expect(response.body).toBe("");
  });

  it("returns 404 when deleting a missing recording", async () => {
    const app = buildApp({
      recordingRepository: createFakeRecordingRepository(),
      accessTokenVerifier: createFakeAccessTokenVerifier(),
    });

    const response = await app.inject({
      method: "DELETE",
      url: "/recordings/missing-id",
    });

    expect(response.statusCode).toBe(404);
    expect(response.json()).toEqual({
      error: "recording_not_found",
      message: "Recording not found.",
    });
  });
});

function createFakeRecordingRepository(): RecordingRepository {
  return {
    async createRecording(input) {
      return {
        id: "recording-id",
        publicId: "public-id",
        title: input.title,
        description: input.description,
        videoUrl: "https://cdn.example.com/recording.webm",
        storagePath: "recordings/public-id.webm",
        duration: input.duration,
        fileSize: input.file.size,
        mimeType: input.file.mimeType,
        sourceUrl: input.sourceUrl,
        createdAt: "2026-06-19T00:00:00.000Z",
      };
    },

    async findRecordingByPublicId(publicId) {
      if (publicId !== "public-id") {
        return null;
      }

      return createFakeRecording();
    },

    async listRecordings(_userId) {
      return [createFakeRecording()];
    },

    async updateRecordingByPublicId(publicId, _userId, input) {
      if (publicId !== "public-id") {
        return null;
      }

      return {
        ...createFakeRecording(),
        title: input.title,
        description: input.description,
      };
    },

    async deleteRecordingByPublicId(publicId, _userId) {
      return publicId === "public-id";
    },
  };
}

function createFakeAccessTokenVerifier() {
  return async () => "user-id";
}

function createFakeRecording() {
  return {
    id: "recording-id",
    publicId: "public-id",
    title: "Checkout bug",
    description: "Payment button fails.",
    videoUrl: "https://cdn.example.com/recording.webm",
    storagePath: "recordings/public-id.webm",
    duration: 1234,
    fileSize: 12,
    mimeType: "video/webm",
    sourceUrl: "https://example.com/checkout",
    createdAt: "2026-06-19T00:00:00.000Z",
  };
}

function createMultipartBody(options: {
  fileContent: string;
  fileName: string;
  mimeType: string;
  fields?: Record<string, string>;
}) {
  const boundary = "----bugsy-test-boundary";
  const chunks: string[] = [];

  for (const [name, value] of Object.entries(options.fields ?? {})) {
    chunks.push(`--${boundary}`);
    chunks.push(`Content-Disposition: form-data; name="${name}"`);
    chunks.push("");
    chunks.push(value);
  }

  chunks.push(`--${boundary}`);
  chunks.push(`Content-Disposition: form-data; name="video"; filename="${options.fileName}"`);
  chunks.push(`Content-Type: ${options.mimeType}`);
  chunks.push("");
  chunks.push(options.fileContent);
  chunks.push(`--${boundary}--`);
  chunks.push("");

  return {
    headers: {
      "content-type": `multipart/form-data; boundary=${boundary}`,
    },
    payload: Buffer.from(chunks.join("\r\n")),
  };
}
