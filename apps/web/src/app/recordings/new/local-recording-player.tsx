"use client";

import { useEffect, useState } from "react";

type LocalRecordingPreviewResponse =
  | {
      ok: true;
      message: string;
      preview: {
        dataUrl: string;
        mimeType: string;
        duration: number;
        size: number;
        sourceUrl: string;
      };
    }
  | {
      ok: false;
      message: string;
    };

type LocalRecordingPlayerProps = {
  extensionId?: string;
  hasExtensionRecording: boolean;
};

type PreviewState =
  | {
      type: "idle" | "loading";
      message: string;
    }
  | {
      type: "ready";
      dataUrl: string;
    }
  | {
      type: "error";
      message: string;
    };

export function LocalRecordingPlayer({
  extensionId,
  hasExtensionRecording,
}: LocalRecordingPlayerProps) {
  const [preview, setPreview] = useState<PreviewState>({
    type: hasExtensionRecording ? "loading" : "idle",
    message: hasExtensionRecording ? "Carregando vídeo local..." : "Aguardando gravação.",
  });

  useEffect(() => {
    if (!hasExtensionRecording) {
      return;
    }

    if (!extensionId) {
      return;
    }

    let isMounted = true;

    requestLocalRecordingPreview(extensionId)
      .then((response) => {
        if (!isMounted) {
          return;
        }

        if (!response.ok) {
          setPreview({
            type: "error",
            message: response.message,
          });
          return;
        }

        setPreview({
          type: "ready",
          dataUrl: response.preview.dataUrl,
        });
      })
      .catch((error) => {
        if (!isMounted) {
          return;
        }

        setPreview({
          type: "error",
          message: error instanceof Error ? error.message : "Não foi possível carregar o vídeo.",
        });
      });

    return () => {
      isMounted = false;
    };
  }, [extensionId, hasExtensionRecording]);

  if (hasExtensionRecording && !extensionId) {
    return (
      <PreviewMessage message="Não foi possível identificar a extensão para carregar o vídeo." />
    );
  }

  if (preview.type === "ready") {
    return (
      <video
        key={preview.dataUrl.slice(0, 96)}
        className="aspect-video w-full rounded-xl border border-white/10 bg-black object-contain shadow-[0_18px_38px_rgba(0,0,0,0.35)]"
        controls
        playsInline
        preload="metadata"
        src={preview.dataUrl}
      >
        Seu navegador não conseguiu reproduzir este vídeo.
      </video>
    );
  }

  return (
    <PreviewMessage message={preview.message} />
  );
}

function PreviewMessage({ message }: { message: string }) {
  return (
    <div className="grid aspect-video w-full place-items-center rounded-xl border border-white/10 bg-black/35 px-6 text-center">
      <p className="max-w-sm text-sm font-bold leading-6 text-[#c9c2ad]">{message}</p>
    </div>
  );
}

function requestLocalRecordingPreview(extensionId: string) {
  return new Promise<LocalRecordingPreviewResponse>((resolve, reject) => {
    const runtime = window.chrome?.runtime;

    if (!runtime?.sendMessage) {
      reject(new Error("A extensão não está disponível nesta página."));
      return;
    }

    runtime.sendMessage(
      extensionId,
      {
        type: "GET_LATEST_RECORDING_PREVIEW",
      },
      (response) => {
        const chromeError = runtime.lastError?.message;

        if (chromeError) {
          reject(new Error(chromeError));
          return;
        }

        if (!response) {
          reject(new Error("A extensão não respondeu ao pedido de preview."));
          return;
        }

        resolve(response as LocalRecordingPreviewResponse);
      },
    );
  });
}
