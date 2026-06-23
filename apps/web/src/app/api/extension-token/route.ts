import { NextResponse } from "next/server";

import { auth } from "@/auth";
import { createApiToken } from "@/lib/api-token";

export async function GET() {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json(
      {
        error: "unauthorized",
        message: "Entre com o Google para enviar a gravação.",
      },
      { status: 401 },
    );
  }

  return NextResponse.json({
    accessToken: await createApiToken(session.user.id, ["recordings:write"]),
    expiresIn: 300,
  });
}
