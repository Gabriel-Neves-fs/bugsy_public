"use client";

import Link from "next/link";
import { ExternalLink, Search, X } from "lucide-react";
import { useMemo, useState } from "react";

import { CopyLinkButton } from "./copy-link-button";
import { DeleteRecordingButton } from "./delete-recording-button";
import { EditRecordingButton } from "./edit-recording-button";

export type DashboardRecording = {
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

export function RecordingList({ recordings }: { recordings: DashboardRecording[] }) {
  const [query, setQuery] = useState("");
  const normalizedQuery = query.trim().toLocaleLowerCase("pt-BR");
  const filteredRecordings = useMemo(() => {
    if (!normalizedQuery) {
      return recordings;
    }

    return recordings.filter((recording) => {
      const searchableContent = [
        recording.title,
        recording.description,
        formatSource(recording.sourceUrl),
      ]
        .filter(Boolean)
        .join(" ")
        .toLocaleLowerCase("pt-BR");

      return searchableContent.includes(normalizedQuery);
    });
  }, [normalizedQuery, recordings]);

  return (
    <section className="grid gap-3">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <label className="relative block w-full sm:max-w-sm">
          <span className="sr-only">Pesquisar gravações</span>
          <Search
            aria-hidden="true"
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#858188]"
            size={17}
          />
          <input
            className="h-10 w-full rounded-lg border border-[#16151a]/12 bg-white pl-10 pr-10 text-sm outline-none transition placeholder:text-[#9a969c] focus:border-[#d85a30] focus:ring-3 focus:ring-[#d85a30]/10"
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Pesquisar gravações"
            type="search"
            value={query}
          />
          {query ? (
            <button
              className="absolute right-1 top-1 inline-grid size-8 place-items-center rounded-lg text-[#686a70] transition hover:bg-[#16151a]/6 hover:text-[#16151a]"
              onClick={() => setQuery("")}
              type="button"
              aria-label="Limpar pesquisa"
              title="Limpar pesquisa"
            >
              <X aria-hidden="true" size={16} />
            </button>
          ) : null}
        </label>

        <p className="text-sm text-[#686a70]" aria-live="polite">
          <strong className="font-mono text-[#16151a]">{filteredRecordings.length}</strong>{" "}
          {filteredRecordings.length === 1 ? "resultado" : "resultados"}
        </p>
      </div>

      {filteredRecordings.length === 0 ? (
        <div className="grid min-h-48 place-items-center rounded-lg border border-dashed border-[#16151a]/20 bg-[#fbfaf8] px-6 text-center">
          <div>
            <p className="font-black">Nenhuma gravação encontrada.</p>
            <p className="mt-2 text-sm text-[#686a70]">Tente pesquisar por outro termo.</p>
          </div>
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg border border-[#16151a]/10 bg-white shadow-[0_14px_34px_rgba(17,17,24,0.06)]">
          <div className="hidden grid-cols-[minmax(0,1fr)_120px_130px_230px] border-b border-[#16151a]/10 bg-[#fbfaf8] px-4 py-3 text-xs font-black uppercase tracking-[0.1em] text-[#686a70] md:grid">
            <span>Gravação</span>
            <span>Duração</span>
            <span>Data</span>
            <span className="text-right">Ações</span>
          </div>

          {filteredRecordings.map((recording) => (
            <article
              key={recording.id}
              className="grid gap-4 border-b border-[#16151a]/10 px-4 py-4 last:border-b-0 md:grid-cols-[minmax(0,1fr)_120px_130px_230px] md:items-center"
            >
              <div className="min-w-0">
                <Link
                  href={`/r/${recording.publicId}`}
                  className="block truncate font-black transition hover:text-[#d85a30]"
                >
                  {recording.title}
                </Link>
                <p className="mt-1 truncate text-sm text-[#686a70]">
                  {formatSource(recording.sourceUrl)}
                </p>
              </div>

              <MetadataValue label="Duração" value={formatDuration(recording.duration)} />
              <MetadataValue label="Data" value={formatDate(recording.createdAt)} />

              <div className="flex items-center gap-2 md:justify-end">
                <Link
                  href={`/r/${recording.publicId}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-grid size-9 place-items-center rounded-lg bg-[#16151a] text-white transition hover:bg-[#d85a30]"
                  aria-label={`Abrir gravação ${recording.title}`}
                  title="Abrir gravação"
                >
                  <ExternalLink aria-hidden="true" size={17} strokeWidth={2.4} />
                </Link>
                <CopyLinkButton publicId={recording.publicId} />
                <EditRecordingButton
                  publicId={recording.publicId}
                  initialTitle={recording.title}
                  initialDescription={recording.description}
                />
                <DeleteRecordingButton publicId={recording.publicId} title={recording.title} />
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}

function MetadataValue({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 text-sm md:block">
      <span className="font-bold text-[#858188] md:hidden">{label}</span>
      <span className="font-mono font-bold text-[#454249]">{value}</span>
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

function formatSource(sourceUrl: string | null) {
  if (!sourceUrl) {
    return "Origem não informada";
  }

  try {
    return new URL(sourceUrl).hostname;
  } catch {
    return sourceUrl;
  }
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}
