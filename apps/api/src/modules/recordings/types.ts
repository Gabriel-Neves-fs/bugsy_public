export type CreateRecordingInput = {
  userId: string;
  title: string;
  description: string | null;
  sourceUrl: string | null;
  duration: number | null;
  file: {
    buffer: Buffer;
    fileName: string;
    mimeType: string;
    size: number;
  };
};

export type CreateRecordingResult = {
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
  createdAt: string;
};

export type PublicRecording = CreateRecordingResult;

export type UpdateRecordingInput = {
  title: string;
  description: string | null;
};

export type RecordingRepository = {
  createRecording(input: CreateRecordingInput): Promise<CreateRecordingResult>;
  findRecordingByPublicId(publicId: string): Promise<PublicRecording | null>;
  listRecordings(userId: string): Promise<PublicRecording[]>;
  updateRecordingByPublicId(
    publicId: string,
    userId: string,
    input: UpdateRecordingInput,
  ): Promise<PublicRecording | null>;
  deleteRecordingByPublicId(publicId: string, userId: string): Promise<boolean>;
};
