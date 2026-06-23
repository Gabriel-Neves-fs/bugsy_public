"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Trash2, X } from "lucide-react";

import { deleteRecording } from "./actions";

type DeleteRecordingButtonProps = {
  publicId: string;
  title: string;
};

export function DeleteRecordingButton({ publicId, title }: DeleteRecordingButtonProps) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [error, setError] = useState<string>();
  const [isPending, startTransition] = useTransition();

  function closeModal() {
    if (isPending) {
      return;
    }

    setError(undefined);
    setIsOpen(false);
  }

  function confirmDelete() {
    setError(undefined);

    startTransition(async () => {
      const result = await deleteRecording(publicId);

      if (!result.ok) {
        setError(result.message);
        return;
      }

      setIsOpen(false);
      router.refresh();
    });
  }

  return (
    <>
      <button
        className="inline-grid size-9 place-items-center rounded-lg border border-red-500/20 bg-white text-red-700 transition hover:border-red-500/40 hover:bg-red-50"
        onClick={() => setIsOpen(true)}
        type="button"
        aria-label={`Excluir gravação ${title}`}
        title="Excluir gravação"
      >
        <Trash2 aria-hidden="true" size={17} strokeWidth={2.3} />
      </button>

      {isOpen ? (
        <div
          className="fixed inset-0 z-50 grid place-items-center bg-black/55 px-5 py-8"
          role="presentation"
        >
          <section
            className="relative w-full max-w-md rounded-lg border border-[#16151a]/10 bg-white p-5 text-left shadow-[0_24px_70px_rgba(17,17,24,0.3)]"
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-recording-title"
            aria-describedby="delete-recording-description"
          >
            <button
              className="absolute right-4 top-4 inline-grid size-8 place-items-center rounded-lg text-[#686a70] transition hover:bg-[#16151a]/6 hover:text-[#16151a]"
              onClick={closeModal}
              type="button"
              aria-label="Fechar confirmação"
              title="Fechar"
            >
              <X aria-hidden="true" size={18} />
            </button>

            <div className="grid size-10 place-items-center rounded-lg bg-red-50 text-red-700">
              <Trash2 aria-hidden="true" size={20} strokeWidth={2.3} />
            </div>

            <h2 id="delete-recording-title" className="mt-4 pr-10 text-xl font-black">
              Excluir esta gravação?
            </h2>
            <p id="delete-recording-description" className="mt-2 text-sm leading-6 text-[#686a70]">
              O vídeo <strong className="text-[#16151a]">{title}</strong> será removido. Essa ação
              não pode ser desfeita.
            </p>

            {error ? (
              <p className="mt-4 rounded-lg border border-red-500/20 bg-red-50 p-3 text-sm text-red-800">
                {error}
              </p>
            ) : null}

            <div className="mt-5 flex justify-end gap-2">
              <button
                className="h-10 rounded-lg border border-[#16151a]/12 px-4 text-sm font-black text-[#454249] transition hover:bg-[#16151a]/5 disabled:opacity-50"
                disabled={isPending}
                onClick={closeModal}
                type="button"
              >
                Cancel
              </button>
              <button
                className="h-10 rounded-lg bg-red-700 px-4 text-sm font-black text-white transition hover:bg-red-800 disabled:cursor-wait disabled:opacity-60"
                disabled={isPending}
                onClick={confirmDelete}
                type="button"
              >
                {isPending ? "Deleting..." : "Delete"}
              </button>
            </div>
          </section>
        </div>
      ) : null}
    </>
  );
}
