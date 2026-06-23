"use client";

import { useRouter } from "next/navigation";
import type { FormEvent } from "react";
import { useMemo, useState } from "react";

type UploadStatus =
  | {
      type: "idle";
      message: string;
    }
  | {
      type: "loading";
      message: string;
    }
  | {
      type: "success";
      message: string;
      publicId: string;
      videoUrl: string;
    }
  | {
      type: "error";
      message: string;
    };

type UploadRecordingResponse =
  | {
      ok: true;
      message: string;
      recording: {
        publicId: string;
        videoUrl: string;
      };
    }
  | {
      ok: false;
      message: string;
    };

type ChromeRuntime = {
  lastError?: {
    message?: string;
  };
  sendMessage: (
    extensionId: string,
    message: unknown,
    callback: (response?: unknown) => void,
  ) => void;
};

declare global {
  interface Window {
    chrome?: {
      runtime?: ChromeRuntime;
    };
  }
}

type UploadRecordingFormProps = {
  defaultTitle: string;
  extensionId?: string;
  hasExtensionRecording: boolean;
};

export function UploadRecordingForm({
  defaultTitle,
  extensionId,
  hasExtensionRecording,
}: UploadRecordingFormProps) {
  const router = useRouter();
  const [title, setTitle] = useState(defaultTitle);
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState<UploadStatus>({
    type: "idle",
    message: hasExtensionRecording
      ? "Preencha o contexto e envie o vídeo."
      : "Grave uma aba pela extensão para liberar o upload.",
  });

  const canUpload = useMemo(
    () =>
      Boolean(
        hasExtensionRecording &&
        extensionId &&
        title.trim() &&
        status.type !== "loading" &&
        status.type !== "success",
      ),
    [extensionId, hasExtensionRecording, status.type, title],
  );

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!extensionId) {
      setStatus({
        type: "error",
        message: "A página não recebeu o ID da extensão. Grave novamente pelo popup do Bugsy.",
      });
      return;
    }

    if (!window.chrome?.runtime?.sendMessage) {
      setStatus({
        type: "error",
        message:
          "O Chrome não liberou a ponte com a extensão. Recarregue a extensão e tente de novo.",
      });
      return;
    }

    setStatus({
      type: "loading",
      message: "Enviando...",
    });

    try {
      const accessToken = await getExtensionAccessToken();
      const response = await requestExtensionUpload({
        extensionId,
        accessToken,
        title: title.trim(),
        description: description.trim(),
      });

      if (!response.ok) {
        setStatus({
          type: "error",
          message: response.message,
        });
        return;
      }

      setStatus({
        type: "success",
        message: "Gravação salva. Abrindo a página pública...",
        publicId: response.recording.publicId,
        videoUrl: response.recording.videoUrl,
      });
      router.replace(`/r/${response.recording.publicId}`);
    } catch (error) {
      setStatus({
        type: "error",
        message: error instanceof Error ? error.message : "Não foi possível enviar a gravação.",
      });
    }
  }

  return (
    <form className="mt-5 grid gap-4" onSubmit={handleSubmit}>
      <label className="grid gap-2 text-sm font-bold">
        Título
        <input
          className="h-11 rounded-lg border border-[#16151a]/15 bg-white px-3 font-normal outline-none transition focus:border-[#d85a30] focus:ring-4 focus:ring-[#d85a30]/10"
          onChange={(event) => setTitle(event.target.value)}
          placeholder="Exemplo: erro no checkout durante o pagamento"
          type="text"
          value={title}
        />
      </label>

      <label className="grid gap-2 text-sm font-bold">
        Descrição
        <textarea
          className="min-h-32 resize-none rounded-lg border border-[#16151a]/15 bg-white px-3 py-3 font-normal outline-none transition focus:border-[#d85a30] focus:ring-4 focus:ring-[#d85a30]/10"
          onChange={(event) => setDescription(event.target.value)}
          placeholder="O que aconteceu, o que era esperado e onde o problema ocorreu."
          value={description}
        />
      </label>

      <button
        className="mt-2 h-11 rounded-lg bg-[#d85a30] text-sm font-black text-white shadow-[0_10px_22px_rgba(216,90,48,0.22)] transition enabled:hover:-translate-y-0.5 enabled:hover:bg-[#c94f29] disabled:cursor-not-allowed disabled:opacity-55"
        disabled={!canUpload}
        type="submit"
      >
        {status.type === "loading" ? "Enviando..." : "Enviar gravação"}
      </button>

      <StatusMessage status={status} />
    </form>
  );
}

function requestExtensionUpload(input: {
  extensionId: string;
  accessToken: string;
  title: string;
  description: string;
}) {
  return new Promise<UploadRecordingResponse>((resolve, reject) => {
    const runtime = window.chrome?.runtime;

    if (!runtime?.sendMessage) {
      reject(new Error("A extensão não está disponível nesta página."));
      return;
    }

    runtime.sendMessage(
      input.extensionId,
      {
        type: "UPLOAD_LATEST_RECORDING",
        accessToken: input.accessToken,
        title: input.title,
        description: input.description,
      },
      (response) => {
        const chromeError = runtime.lastError?.message;

        if (chromeError) {
          reject(new Error(chromeError));
          return;
        }

        if (!response) {
          reject(new Error("A extensão não respondeu ao pedido de upload."));
          return;
        }

        resolve(response as UploadRecordingResponse);
      },
    );
  });
}

async function getExtensionAccessToken() {
  const response = await fetch("/api/extension-token", {
    cache: "no-store",
  });

  if (response.status === 401) {
    throw new Error("Sua sessão expirou. Entre novamente com o Google.");
  }

  if (!response.ok) {
    throw new Error("Não foi possível autorizar o envio desta gravação.");
  }

  const body = (await response.json()) as {
    accessToken?: string;
  };

  if (!body.accessToken) {
    throw new Error("O token de envio retornado pelo Bugsy é inválido.");
  }

  return body.accessToken;
}

function StatusMessage({ status }: { status: UploadStatus }) {
  if (status.type === "success") {
    return (
      <div className="rounded-lg border border-emerald-500/20 bg-emerald-50 p-3 text-sm leading-6 text-emerald-900">
        <p className="font-black">{status.message}</p>
        <a
          className="mt-1 block font-bold underline underline-offset-4"
          href={`/r/${status.publicId}`}
        >
          Abrir página pública manualmente
        </a>
      </div>
    );
  }

  const tone =
    status.type === "error"
      ? "border-red-500/20 bg-red-50 text-red-800"
      : "border-[#16151a]/10 bg-[#fbfaf8] text-[#5e5a57]";

  return <p className={`rounded-lg border p-3 text-sm leading-6 ${tone}`}>{status.message}</p>;
}
