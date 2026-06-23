import Image from "next/image";
import { redirect } from "next/navigation";

import { auth, signIn } from "@/auth";
import { PortfolioFooter } from "../portfolio-footer";

type LoginPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const session = await auth();
  const params = (await searchParams) ?? {};
  const callbackUrl = normalizeCallbackUrl(getParam(params, "callbackUrl"));

  if (session?.user?.id) {
    redirect(callbackUrl);
  }

  async function signInWithGoogle() {
    "use server";
    await signIn("google", {
      redirectTo: callbackUrl,
    });
  }

  return (
    <main className="flex min-h-screen flex-col bg-white text-[#16151a]">
      <div className="grid flex-1 place-items-center px-5 py-8">
        <section className="grid w-full max-w-sm gap-6 rounded-lg border border-[#16151a]/10 bg-white p-6 shadow-[0_24px_70px_rgba(17,17,24,0.1)]">
          <div className="flex items-center gap-3 border-b border-[#16151a]/10 pb-5">
            <Image
              src="/brand/bugsy-logo-dark.svg"
              alt=""
              width={52}
              height={52}
              className="size-13 rounded-lg"
              aria-hidden="true"
            />
            <div>
              <p className="font-serif text-3xl font-black leading-none">bugsy</p>
              <p className="mt-2 font-serif text-[10px] uppercase tracking-[0.24em] text-[#d85a30]">
                screen recorder
              </p>
            </div>
          </div>

          <div>
            <p className="text-xs font-black uppercase tracking-[0.12em] text-[#d85a30]">Acesso</p>
            <h1 className="mt-2 text-2xl font-black">Entre na sua biblioteca</h1>
            <p className="mt-2 text-sm leading-6 text-[#686a70]">
              Suas gravações ficam vinculadas à conta usada no Google.
            </p>
          </div>

          <form action={signInWithGoogle}>
            <button
              className="group relative flex h-12 w-full items-center justify-center gap-3 overflow-hidden rounded-md border border-[#dadce0] bg-white px-5 text-sm font-semibold text-[#3c4043] shadow-[0_1px_2px_rgba(60,64,67,0.08)] transition-[border-color,box-shadow,background-color,transform] duration-200 hover:border-[#c5c8cc] hover:bg-[#f8f9fa] hover:shadow-[0_2px_5px_rgba(60,64,67,0.16)] active:translate-y-px active:shadow-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#d85a30]"
              type="submit"
            >
              <Image src="/brand/google-g.svg" alt="" width={20} height={20} aria-hidden="true" />
              Entrar com Google
            </button>
          </form>

          <p className="text-center text-xs leading-5 text-[#858188]">
            O Bugsy usa o Google apenas para identificar sua conta e proteger suas gravações.
          </p>
        </section>
      </div>
      <PortfolioFooter />
    </main>
  );
}

function getParam(params: Record<string, string | string[] | undefined>, key: string) {
  const value = params[key];
  return Array.isArray(value) ? value[0] : value;
}

function normalizeCallbackUrl(value: string | undefined) {
  return value?.startsWith("/") && !value.startsWith("//") ? value : "/";
}
