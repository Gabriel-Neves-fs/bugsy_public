"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";

type CopyLinkButtonProps = {
  publicId: string;
};

export function CopyLinkButton({ publicId }: CopyLinkButtonProps) {
  const [copied, setCopied] = useState(false);

  async function copyPublicLink() {
    const publicUrl = new URL(`/r/${publicId}`, window.location.origin).toString();

    try {
      await navigator.clipboard.writeText(publicUrl);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopied(false);
    }
  }

  return (
    <button
      className="inline-grid size-9 place-items-center rounded-lg border border-[#16151a]/12 bg-white text-[#36343a] transition hover:border-[#d85a30]/40 hover:text-[#d85a30]"
      onClick={copyPublicLink}
      type="button"
      aria-label={copied ? "Link copiado" : "Copiar link público"}
      title={copied ? "Link copiado" : "Copiar link público"}
    >
      {copied ? (
        <Check aria-hidden="true" size={17} strokeWidth={2.4} />
      ) : (
        <Copy aria-hidden="true" size={17} strokeWidth={2.4} />
      )}
    </button>
  );
}
