-- CreateTable
CREATE TABLE "recordings" (
    "id" UUID NOT NULL,
    "public_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "video_url" TEXT NOT NULL,
    "storage_path" TEXT NOT NULL,
    "duration" INTEGER,
    "file_size" INTEGER NOT NULL,
    "mime_type" TEXT NOT NULL,
    "source_url" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "recordings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "recordings_public_id_key" ON "recordings"("public_id");

-- CreateIndex
CREATE INDEX "recordings_public_id_idx" ON "recordings"("public_id");
