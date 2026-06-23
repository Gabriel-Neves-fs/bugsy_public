import Image from "next/image";
import Link from "next/link";
import { LogOut } from "lucide-react";
import { redirect } from "next/navigation";

import { auth, signOut } from "@/auth";
import { createApiToken } from "@/lib/api-token";
import { PortfolioFooter } from "./portfolio-footer";
import { RecordingList, type DashboardRecording } from "./recording-list";

type RecordingsResponse = {
  recordings: DashboardRecording[];
};

const API_BASE_URL = process.env.BUGSY_API_URL ?? "http://127.0.0.1:3333";

export default async function Home() {
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/login?callbackUrl=/");
  }

  const result = await getRecordings(session.user.id);

  return (
    <main className="min-h-screen bg-white text-[#16151a]">
      <Header user={session.user} />

      <div className="mx-auto grid w-full max-w-6xl gap-6 px-5 py-7">
        <section className="flex flex-col justify-between gap-5 border-b border-[#16151a]/10 pb-6 md:flex-row md:items-end">
          <div>
            <p className="text-sm font-black uppercase tracking-[0.12em] text-[#d85a30]">
              Biblioteca
            </p>
            <h1 className="mt-2 text-3xl font-black">Suas gravações</h1>
            <p className="mt-2 max-w-xl text-sm leading-6 text-[#686a70]">
              Evidências capturadas pela extensão e disponíveis para compartilhamento.
            </p>
          </div>

          {result.ok ? <DashboardSummary recordings={result.recordings} /> : null}
        </section>

        {!result.ok ? <DashboardError message={result.message} /> : null}
        {result.ok && result.recordings.length === 0 ? <EmptyDashboard /> : null}
        {result.ok && result.recordings.length > 0 ? (
          <RecordingList recordings={result.recordings} />
        ) : null}
      </div>
      <PortfolioFooter />
    </main>
  );
}

function Header({
  user,
}: {
  user: { name?: string | null; email?: string | null; image?: string | null };
}) {
  return (
    <header className="border-b border-[#16151a]/10 bg-white">
      <div className="mx-auto flex min-h-18 w-full max-w-6xl items-center justify-between gap-4 px-5">
        <Link href="/" className="flex items-center gap-3" aria-label="Início do Bugsy">
          <Image
            src="/brand/bugsy-logo-dark.svg"
            alt=""
            width={44}
            height={44}
            className="h-11 w-11 rounded-lg"
            aria-hidden="true"
          />
          <span>
            <span className="block font-serif text-2xl font-black leading-none">bugsy</span>
            <span className="font-serif text-[10px] uppercase tracking-[0.28em] text-[#686a70]">
              screen recorder
            </span>
          </span>
        </Link>

        <div className="flex min-w-0 items-center gap-3">
          {user.image ? (
            <Image
              src={user.image}
              alt={`Foto de ${user.name ?? "usuário"}`}
              width={40}
              height={40}
              className="size-10 rounded-full object-cover"
              unoptimized
            />
          ) : (
            <span
              className="grid size-10 place-items-center rounded-full bg-[#16151a] text-sm font-black uppercase text-white"
              aria-hidden="true"
            >
              {user.name?.charAt(0) || user.email?.charAt(0) || "U"}
            </span>
          )}
          <div className="hidden min-w-0 text-right sm:block">
            <p className="truncate text-sm font-black">{user.name ?? "Conta Google"}</p>
            <p className="truncate text-xs text-[#858188]">{user.email}</p>
          </div>
          <form
            action={async () => {
              "use server";
              await signOut({ redirectTo: "/login" });
            }}
          >
            <button
              className="inline-grid size-9 place-items-center rounded-lg border border-[#16151a]/12 bg-white text-[#454249] transition hover:border-[#d85a30]/35 hover:text-[#d85a30]"
              type="submit"
              aria-label="Sair da conta"
              title="Sair"
            >
              <LogOut aria-hidden="true" size={17} strokeWidth={2.3} />
            </button>
          </form>
        </div>
      </div>
    </header>
  );
}

function DashboardSummary({ recordings }: { recordings: DashboardRecording[] }) {
  const totalDuration = recordings.reduce((total, recording) => total + (recording.duration ?? 0), 0);
  const latestRecording = recordings[0];

  return (
    <dl className="grid grid-cols-3 gap-5 text-right">
      <SummaryItem label="Gravações" value={String(recordings.length)} />
      <SummaryItem label="Tempo total" value={formatCompactDuration(totalDuration)} />
      <SummaryItem
        label="Mais recente"
        value={latestRecording ? formatShortDate(latestRecording.createdAt) : "--"}
      />
    </dl>
  );
}

function SummaryItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs font-bold text-[#858188]">{label}</dt>
      <dd className="mt-1 font-mono text-sm font-black text-[#16151a]">{value}</dd>
    </div>
  );
}

function EmptyDashboard() {
  return (
    <section className="grid min-h-72 place-items-center rounded-lg border border-dashed border-[#16151a]/20 bg-[#fbfaf8] px-6 text-center">
      <div className="max-w-md">
        <p className="text-sm font-black uppercase tracking-[0.12em] text-[#d85a30]">
          Nenhuma gravação
        </p>
        <h2 className="mt-2 text-2xl font-black">Sua biblioteca está vazia.</h2>
        <p className="mt-3 text-sm leading-6 text-[#686a70]">
          Use a extensão do Bugsy para gravar uma aba. Depois do upload, a evidência aparecerá aqui.
        </p>
      </div>
    </section>
  );
}

function DashboardError({ message }: { message: string }) {
  return (
    <section className="grid min-h-64 place-items-center rounded-lg border border-red-500/20 bg-red-50 px-6 text-center">
      <div className="max-w-md">
        <p className="text-sm font-black uppercase tracking-[0.12em] text-red-700">
          Dashboard indisponível
        </p>
        <h2 className="mt-2 text-2xl font-black">Não foi possível carregar as gravações.</h2>
        <p className="mt-3 text-sm leading-6 text-red-800">{message}</p>
      </div>
    </section>
  );
}

async function getRecordings(userId: string) {
  try {
    const accessToken = await createApiToken(userId, ["recordings:read"]);
    const response = await fetch(`${API_BASE_URL}/recordings`, {
      cache: "no-store",
      headers: {
        authorization: `Bearer ${accessToken}`,
      },
    });

    if (!response.ok) {
      return {
        ok: false as const,
        message: "A API retornou um erro ao listar as gravações.",
      };
    }

    const body = (await response.json()) as RecordingsResponse;

    return {
      ok: true as const,
      recordings: body.recordings,
    };
  } catch {
    return {
      ok: false as const,
      message: "Verifique se a API do Bugsy está rodando na porta 3333.",
    };
  }
}

function formatCompactDuration(duration: number) {
  const totalMinutes = Math.round(duration / 1000 / 60);

  if (totalMinutes < 60) {
    return `${totalMinutes} min`;
  }

  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  return `${hours}h ${minutes}m`;
}

function formatShortDate(value: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
  }).format(new Date(value));
}
