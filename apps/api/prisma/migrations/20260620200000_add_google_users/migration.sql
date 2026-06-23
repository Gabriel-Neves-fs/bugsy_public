CREATE TABLE "users" (
    "id" UUID NOT NULL,
    "google_subject" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "image" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "users_google_subject_key" ON "users"("google_subject");
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

ALTER TABLE "recordings" ADD COLUMN "user_id" UUID;
CREATE INDEX "recordings_user_id_created_at_idx" ON "recordings"("user_id", "created_at");

ALTER TABLE "recordings"
ADD CONSTRAINT "recordings_user_id_fkey"
FOREIGN KEY ("user_id") REFERENCES "users"("id")
ON DELETE SET NULL ON UPDATE CASCADE;
