import { BriefcaseBusiness, Code2, Mail } from "lucide-react";
import type { ReactNode } from "react";

const portfolioLinks = {
  email: "mailto:gabrielnevesdev01@gmail.com",
  github: "https://github.com/Gabriel-Neves-fs",
  linkedin: "https://www.linkedin.com/in/gabriel-neves-4194a4389/",
};

export function PortfolioFooter() {
  return (
    <footer className="mx-auto flex w-full max-w-6xl flex-col items-center justify-between gap-4 border-t border-[#16151a]/10 px-5 py-6 text-sm text-[#686a70] sm:flex-row">
      <p>
        Desenvolvido por <strong className="font-black text-[#16151a]">Gabriel Neves</strong>
      </p>

      <nav className="flex items-center gap-2" aria-label="Links de Gabriel Neves">
        <FooterLink href={portfolioLinks.email} label="E-mail">
          <Mail aria-hidden="true" size={16} strokeWidth={2.2} />
        </FooterLink>
        <FooterLink href={portfolioLinks.github} label="GitHub">
          <Code2 aria-hidden="true" size={16} strokeWidth={2.2} />
        </FooterLink>
        <FooterLink href={portfolioLinks.linkedin} label="LinkedIn">
          <BriefcaseBusiness aria-hidden="true" size={16} strokeWidth={2.2} />
        </FooterLink>
      </nav>
    </footer>
  );
}

function FooterLink({
  href,
  label,
  children,
}: {
  href: string;
  label: string;
  children: ReactNode;
}) {
  return (
    <a
      href={href}
      className="inline-flex size-9 items-center justify-center rounded-lg border border-[#16151a]/10 bg-white text-[#454249] transition hover:border-[#d85a30]/35 hover:bg-[#fbfaf8] hover:text-[#d85a30] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#d85a30]"
      target={href.startsWith("mailto:") ? undefined : "_blank"}
      rel={href.startsWith("mailto:") ? undefined : "noreferrer"}
      aria-label={label}
      title={label}
    >
      {children}
    </a>
  );
}
