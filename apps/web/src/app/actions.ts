"use server";

import { revalidatePath } from "next/cache";

import { auth } from "@/auth";
import { createApiToken } from "@/lib/api-token";

const API_BASE_URL = process.env.BUGSY_API_URL ?? "http://127.0.0.1:3333";

export async function updateRecording(
  publicId: string,
  input: {
    title: string;
    description: string | null;
  },
) {
  try {
    const accessToken = await getWriteAccessToken();

    if (!accessToken) {
      return {
        ok: false as const,
        message: "Sua sessão expirou. Entre novamente com o Google.",
      };
    }

    const response = await fetch(
      `${API_BASE_URL}/recordings/${encodeURIComponent(publicId)}`,
      {
        method: "PATCH",
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify(input),
      },
    );

    if (response.status === 404) {
      return {
        ok: false as const,
        message: "A gravação não foi encontrada.",
      };
    }

    if (response.status === 400) {
      return {
        ok: false as const,
        message: "Revise o título e a descrição informados.",
      };
    }

    if (!response.ok) {
      return {
        ok: false as const,
        message: "A API não conseguiu atualizar a gravação.",
      };
    }

    revalidatePath("/");
    revalidatePath(`/r/${publicId}`);

    return {
      ok: true as const,
    };
  } catch {
    return {
      ok: false as const,
      message: "Não foi possível acessar a API do Bugsy.",
    };
  }
}

export async function deleteRecording(publicId: string) {
  try {
    const accessToken = await getWriteAccessToken();

    if (!accessToken) {
      return {
        ok: false as const,
        message: "Sua sessão expirou. Entre novamente com o Google.",
      };
    }

    const response = await fetch(
      `${API_BASE_URL}/recordings/${encodeURIComponent(publicId)}`,
      {
        method: "DELETE",
        headers: {
          authorization: `Bearer ${accessToken}`,
        },
      },
    );

    if (response.status === 404) {
      return {
        ok: false as const,
        message: "A gravação não foi encontrada.",
      };
    }

    if (!response.ok) {
      return {
        ok: false as const,
        message: "A API não conseguiu excluir a gravação.",
      };
    }

    revalidatePath("/");

    return {
      ok: true as const,
    };
  } catch {
    return {
      ok: false as const,
      message: "Não foi possível acessar a API do Bugsy.",
    };
  }
}

async function getWriteAccessToken() {
  const session = await auth();
  return session?.user?.id
    ? createApiToken(session.user.id, ["recordings:write"])
    : null;
}
