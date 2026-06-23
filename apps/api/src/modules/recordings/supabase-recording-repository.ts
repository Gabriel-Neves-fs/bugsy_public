import { randomBytes, randomUUID } from "node:crypto";

import { createClient } from "@supabase/supabase-js";

import "../../env.js";
import type { PrismaClient } from "../../generated/prisma/client.js";
import { getPrismaClient } from "../../lib/prisma.js";
import type { CreateRecordingResult, RecordingRepository } from "./types.js";

const DEFAULT_BUCKET = "bugsy-recordings";

export function createSupabaseRecordingRepository(
  env = process.env,
  prisma?: PrismaClient,
): RecordingRepository {
  return {
    async createRecording(input) {
      const config = getSupabaseConfig(env);
      const prismaClient = prisma ?? getPrismaClient();
      const supabase = createClient(config.url, config.serviceRoleKey, {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      });

      const publicId = createPublicId();
      const storagePath = `recordings/${publicId}.webm`;

      const { error: uploadError } = await supabase.storage
        .from(config.bucket)
        .upload(storagePath, input.file.buffer, {
          cacheControl: "3600",
          contentType: input.file.mimeType,
          upsert: false,
        });

      if (uploadError) {
        throw new Error(`Supabase storage upload failed: ${uploadError.message}`);
      }

      const { data: publicUrlData } = supabase.storage.from(config.bucket).getPublicUrl(storagePath);

      const recording = await prismaClient.recording.create({
        data: {
          id: randomUUID(),
          publicId,
          title: input.title,
          description: input.description,
          videoUrl: publicUrlData.publicUrl,
          storagePath,
          duration: input.duration,
          fileSize: input.file.size,
          mimeType: input.file.mimeType,
          sourceUrl: input.sourceUrl,
          userId: input.userId,
        },
      });

      return mapRecording(recording);
    },

    async findRecordingByPublicId(publicId) {
      const prismaClient = prisma ?? getPrismaClient();
      const recording = await prismaClient.recording.findUnique({
        where: {
          publicId,
        },
      });

      return recording ? mapRecording(recording) : null;
    },

    async listRecordings(userId) {
      const prismaClient = prisma ?? getPrismaClient();
      const recordings = await prismaClient.recording.findMany({
        where: {
          userId,
        },
        orderBy: {
          createdAt: "desc",
        },
        take: 50,
      });

      return recordings.map(mapRecording);
    },

    async updateRecordingByPublicId(publicId, userId, input) {
      const prismaClient = prisma ?? getPrismaClient();
      const existingRecording = await prismaClient.recording.findFirst({
        where: {
          publicId,
          userId,
        },
      });

      if (!existingRecording) {
        return null;
      }

      const recording = await prismaClient.recording.update({
        where: {
          id: existingRecording.id,
        },
        data: {
          title: input.title,
          description: input.description,
        },
      });

      return mapRecording(recording);
    },

    async deleteRecordingByPublicId(publicId, userId) {
      const config = getSupabaseConfig(env);
      const prismaClient = prisma ?? getPrismaClient();
      const recording = await prismaClient.recording.findFirst({
        where: {
          publicId,
          userId,
        },
      });

      if (!recording) {
        return false;
      }

      const supabase = createClient(config.url, config.serviceRoleKey, {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      });
      const { error: storageError } = await supabase.storage
        .from(config.bucket)
        .remove([recording.storagePath]);

      if (storageError) {
        throw new Error(`Supabase storage delete failed: ${storageError.message}`);
      }

      await prismaClient.recording.delete({
        where: {
          id: recording.id,
        },
      });

      return true;
    },
  };
}

function getSupabaseConfig(env: NodeJS.ProcessEnv) {
  const url = env.SUPABASE_URL;
  const serviceRoleKey = env.SUPABASE_SERVICE_ROLE_KEY;
  const bucket = env.SUPABASE_RECORDINGS_BUCKET ?? DEFAULT_BUCKET;

  if (!url || !serviceRoleKey) {
    throw new Error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.");
  }

  return {
    url,
    serviceRoleKey,
    bucket,
  };
}

function createPublicId() {
  return randomBytes(12).toString("base64url");
}

function mapRecording(recording: {
  id: string;
  publicId: string;
  title: string;
  description: string | null;
  videoUrl: string;
  storagePath: string;
  duration: number | null;
  fileSize: number;
  mimeType: string;
  sourceUrl: string | null;
  createdAt: Date;
}): CreateRecordingResult {
  return {
    id: recording.id,
    publicId: recording.publicId,
    title: recording.title,
    description: recording.description,
    videoUrl: recording.videoUrl,
    storagePath: recording.storagePath,
    duration: recording.duration,
    fileSize: recording.fileSize,
    mimeType: recording.mimeType,
    sourceUrl: recording.sourceUrl,
    createdAt: recording.createdAt.toISOString(),
  };
}
