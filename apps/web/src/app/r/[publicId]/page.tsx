import Image from "next/image";
import Link from "next/link";

import { CopyLinkButton } from "../../copy-link-button";
import { PortfolioFooter } from "../../portfolio-footer";

type PublicRecordingPageProps = {
  params: Promise<{
    publicId: string;
  }>;
};

type PublicRecording = {
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

type RecordingApiResponse = {
  recording: PublicRecording;
};

const API_BASE_URL = process.env.BUGSY_API_URL ?? "http://127.0.0.1:3333";

export default async function PublicRecordingPage({ params }: PublicRecordingPageProps) {
  const { publicId } = await params;
  const result = await getPublicRecording(publicId);

  if (!result.ok) {
    return <PublicRecordingError publicId={publicId} message={result.message} />;
  }

  const recording = result.recording;

  return (
    <main className="min-h-screen bg-white px-5 py-6 text-[#16151a]">
      <div className="mx-auto grid w-full max-w-5xl gap-5">
        <Header publicId={publicId} />

        <section className="overflow-hidden rounded-2xl border border-[#16151a]/10 bg-[#111118] shadow-[0_18px_45px_rgba(17,17,24,0.14)]">
          <video
            className="aspect-video w-full bg-black"
            controls
            playsInline
            preload="metadata"
            src={recording.videoUrl}
          >
            Seu navegador não conseguiu reproduzir este vídeo.
          </video>
        </section>

        <section className="grid gap-4 rounded-2xl border border-[#16151a]/10 bg-white p-5 shadow-[0_18px_45px_rgba(17,17,24,0.06)] md:grid-cols-[1fr_280px]">
          <div>
            <p className="text-sm font-black uppercase tracking-[0.12em] text-[#d85a30]">
              Evidência compartilhada
            </p>
            <h1 className="mt-2 text-3xl font-black">{recording.title}</h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-[#55585f]">
              {recording.description ?? "Esta gravação não possui descrição."}
            </p>
          </div>

          <dl className="grid gap-3 text-sm">
            <MetadataItem label="Duração" value={formatDuration(recording.duration)} />
            <MetadataItem label="Tamanho" value={formatBytes(recording.fileSize)} />
            <MetadataItem label="Origem" value={formatSource(recording.sourceUrl)} />
            <MetadataItem label="Criado em" value={formatDate(recording.createdAt)} />
          </dl>
        </section>
      </div>
      <PortfolioFooter />
    </main>
  );
}

async function getPublicRecording(publicId: string) {
  try {
    const response = await fetch(`${API_BASE_URL}/recordings/${encodeURIComponent(publicId)}`, {
      cache: "no-store",
    });

    if (response.status === 404) {
      return {
        ok: false as const,
        message: "Essa gravação não foi encontrada.",
      };
    }

    if (!response.ok) {
      return {
        ok: false as const,
        message: "Não foi possível carregar essa gravação agora.",
      };
    }

    const body = (await response.json()) as RecordingApiResponse;

    return {
      ok: true as const,
      recording: body.recording,
    };
  } catch {
    return {
      ok: false as const,
      message: "A API do Bugsy não respondeu. Verifique se ela está rodando.",
    };
  }
}

function Header({ publicId }: { publicId: string }) {
  return (
    <header className="flex items-center justify-between gap-4">
      <Link href="/" className="flex items-center gap-3">
        <Image
          src="/brand/bugsy-logo-dark.svg"
          alt=""
          width={36}
          height={36}
          className="h-9 w-9 rounded-lg"
          aria-hidden="true"
        />
        <span className="font-serif text-2xl font-black">bugsy</span>
      </Link>
      <div className="flex min-w-0 items-center gap-2">
        <span className="max-w-28 truncate rounded-lg border border-[#16151a]/10 bg-[#fbfaf8] px-3 py-2 font-mono text-xs sm:max-w-56">
          /r/{publicId}
        </span>
        <CopyLinkButton publicId={publicId} />
      </div>
    </header>
  );
}

function PublicRecordingError({ publicId, message }: { publicId: string; message: string }) {
  return (
    <main className="flex min-h-screen flex-col bg-white px-5 py-6 text-[#16151a]">
      <div className="grid flex-1 place-items-center">
        <div className="grid w-full max-w-xl gap-5 rounded-2xl border border-[#16151a]/10 bg-white p-6 text-center shadow-[0_18px_45px_rgba(17,17,24,0.08)]">
          <Header publicId={publicId} />
          <div className="rounded-2xl bg-[#111118] px-6 py-12">
            <p className="text-sm font-black uppercase tracking-[0.14em] text-[#d85a30]">
              Gravação indisponível
            </p>
            <h1 className="mt-3 text-3xl font-black text-[#fffdf7]">
              Não foi possível abrir o vídeo
            </h1>
            <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-[#c9c2ad]">{message}</p>
          </div>
        </div>
      </div>
      <PortfolioFooter />
    </main>
  );
}

function MetadataItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="font-black">{label}</dt>
      <dd className="mt-1 truncate text-[#686a70]" title={value}>
        {value}
      </dd>
    </div>
  );
}

function formatDuration(duration: number | null) {
  if (duration === null) {
    return "--";
  }

  const totalSeconds = Math.round(duration / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

function formatBytes(bytes: number) {
  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }

  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function formatSource(sourceUrl: string | null) {
  if (!sourceUrl) {
    return "Não informada";
  }

  try {
    return new URL(sourceUrl).hostname;
  } catch {
    return sourceUrl;
  }
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(value));
}
