import "../env.js";
import { getPrismaClient } from "../lib/prisma.js";

const ownerEmail = process.env.LEGACY_OWNER_EMAIL?.trim().toLowerCase();

if (!ownerEmail) {
  throw new Error("Set LEGACY_OWNER_EMAIL before assigning legacy recordings.");
}

const prisma = getPrismaClient();

try {
  const user = await prisma.user.findUnique({
    where: {
      email: ownerEmail,
    },
  });

  if (!user) {
    throw new Error(`No Bugsy user was found for ${ownerEmail}.`);
  }

  const result = await prisma.recording.updateMany({
    where: {
      userId: null,
    },
    data: {
      userId: user.id,
    },
  });

  console.info(`Assigned ${result.count} legacy recording(s) to ${ownerEmail}.`);
} finally {
  await prisma.$disconnect();
}
