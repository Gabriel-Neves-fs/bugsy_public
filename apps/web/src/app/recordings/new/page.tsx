import Link from "next/link";
import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { PortfolioFooter } from "../../portfolio-footer";
import { LocalRecordingPlayer } from "./local-recording-player";
import { UploadRecordingForm } from "./upload-recording-form";

type PageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function NewRecordingPage({ searchParams }: PageProps) {
  const params = (await searchParams) ?? {};
  const session = await auth();

  if (!session?.user?.id) {
    const callbackUrl = buildCallbackUrl(params);
    redirect(`/login?callbackUrl=${encodeURIComponent(callbackUrl)}`);
  }

  const source = getParam(params, "source");
  const sourceUrl = getParam(params, "sourceUrl");
  const duration = getParam(params, "duration");
  const extensionId = getParam(params, "extensionId");
  const size = getParam(params, "size");
  const hasExtensionRecording = source === "extension";
  const defaultTitle = sourceUrl ? `Gravação em ${getHostname(sourceUrl)}` : "Nova gravação Bugsy";

  return (
    <main className="min-h-screen bg-white px-5 py-6 text-[#16151a]">
      <div className="mx-auto grid w-full max-w-6xl gap-5 lg:grid-cols-[1fr_380px]">
        <section className="overflow-hidden rounded-2xl border border-[#16151a]/10 bg-[#111118] shadow-[0_18px_45px_rgba(17,17,24,0.14)]">
          <div className="flex min-h-13 items-center justify-between border-b border-white/10 px-4 text-[#fffdf7]">
            <Link href="/" className="font-serif text-xl font-black text-[#fff8f0]">
              bugsy
            </Link>
            <span className="rounded-md bg-[#d85a30] px-2 py-1 font-mono text-xs text-white">
              preview
            </span>
          </div>

          <div className="grid min-h-105 place-items-center px-6 py-8 text-center">
            {hasExtensionRecording ? (
              <div className="grid w-full max-w-2xl gap-5">
                <div>
                  <p className="text-sm font-black uppercase tracking-[0.14em] text-[#d85a30]">
                    Vídeo capturado
                  </p>
                  <h1 className="mt-3 text-3xl font-black text-[#fffdf7]">
                    A gravação chegou ao web app.
                  </h1>
                  <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-[#c9c2ad]">
                    O arquivo ainda está guardado localmente na extensão. Preencha o contexto ao
                    lado para enviar o vídeo para a API e salvar no Supabase.
                  </p>
                </div>

                <LocalRecordingPlayer
                  extensionId={extensionId}
                  hasExtensionRecording={hasExtensionRecording}
                />

                <div className="grid gap-3 rounded-lg border border-white/10 bg-white/4 p-4 text-left">
                  <MetadataItem
                    label="Duração"
                    value={duration ? formatDuration(duration) : "--"}
                  />
                  <MetadataItem label="Tamanho" value={size ? formatBytes(size) : "--"} />
                  <MetadataItem
                    label="Origem"
                    value={sourceUrl ? getHostname(sourceUrl) : "Aba gravada"}
                  />
                </div>
              </div>
            ) : (
              <div>
                <p className="text-sm font-black uppercase tracking-[0.14em] text-[#d85a30]">
                  Aguardando vídeo
                </p>
                <h1 className="mt-3 text-3xl font-black text-[#fffdf7]">Preview da gravação</h1>
                <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-[#c9c2ad]">
                  Esta página já está pronta para receber dados da extensão. Grave uma aba pelo
                  popup do Bugsy para preencher este preview.
                </p>
              </div>
            )}
          </div>
        </section>

        <aside className="rounded-2xl border border-[#16151a]/10 bg-white p-5 shadow-[0_18px_45px_rgba(17,17,24,0.08)]">
          <p className="text-sm font-black uppercase tracking-[0.12em] text-[#d85a30]">
            Criar gravação
          </p>
          <h2 className="mt-2 text-2xl font-black">Adicionar contexto</h2>

          <UploadRecordingForm
            defaultTitle={defaultTitle}
            extensionId={extensionId}
            hasExtensionRecording={hasExtensionRecording}
          />
        </aside>
      </div>
      <PortfolioFooter />
    </main>
  );
}

function buildCallbackUrl(params: Record<string, string | string[] | undefined>) {
  const query = new URLSearchParams();

  for (const [key, value] of Object.entries(params)) {
    if (Array.isArray(value)) {
      value.forEach((item) => query.append(key, item));
    } else if (value) {
      query.set(key, value);
    }
  }

  const serializedQuery = query.toString();
  return serializedQuery ? `/recordings/new?${serializedQuery}` : "/recordings/new";
}

function MetadataItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-white/10 pb-3 text-sm last:border-b-0 last:pb-0">
      <span className="font-bold text-[#8d887f]">{label}</span>
      <strong className="truncate text-right text-[#fffdf7]">{value}</strong>
    </div>
  );
}

function getParam(params: Record<string, string | string[] | undefined>, key: string) {
  const value = params[key];

  if (Array.isArray(value)) {
    return value[0];
  }

  return value;
}

function formatDuration(milliseconds: string) {
  const totalSeconds = Math.round(Number(milliseconds) / 1000);

  if (!Number.isFinite(totalSeconds)) {
    return "--";
  }

  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

function formatBytes(bytesValue: string) {
  const bytes = Number(bytesValue);

  if (!Number.isFinite(bytes)) {
    return "--";
  }

  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }

  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function getHostname(url: string) {
  try {
    return new URL(url).hostname;
  } catch {
    return url;
  }
}
