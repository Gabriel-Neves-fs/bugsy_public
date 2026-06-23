"use client";

import { Pencil, X } from "lucide-react";
import { useId, useState, useTransition } from "react";
import type { FormEvent } from "react";
import { useRouter } from "next/navigation";

import { updateRecording } from "./actions";

type EditRecordingButtonProps = {
  publicId: string;
  initialTitle: string;
  initialDescription: string | null;
};

export function EditRecordingButton({
  publicId,
  initialTitle,
  initialDescription,
}: EditRecordingButtonProps) {
  const router = useRouter();
  const titleId = useId();
  const descriptionId = useId();
  const [isOpen, setIsOpen] = useState(false);
  const [title, setTitle] = useState(initialTitle);
  const [description, setDescription] = useState(initialDescription ?? "");
  const [error, setError] = useState<string>();
  const [isPending, startTransition] = useTransition();

  function openModal() {
    setTitle(initialTitle);
    setDescription(initialDescription ?? "");
    setError(undefined);
    setIsOpen(true);
  }

  function closeModal() {
    if (!isPending) {
      setIsOpen(false);
      setError(undefined);
    }
  }

  function submitUpdate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const normalizedTitle = title.trim();

    if (!normalizedTitle) {
      setError("Informe um título para a gravação.");
      return;
    }

    setError(undefined);
    startTransition(async () => {
      const result = await updateRecording(publicId, {
        title: normalizedTitle,
        description: description.trim() || null,
      });

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
        className="inline-grid size-9 place-items-center rounded-lg border border-[#16151a]/12 bg-white text-[#454249] transition hover:border-[#d85a30]/35 hover:bg-[#fff8f2] hover:text-[#d85a30]"
        onClick={openModal}
        type="button"
        aria-label={`Editar gravação ${initialTitle}`}
        title="Editar gravação"
      >
        <Pencil aria-hidden="true" size={16} strokeWidth={2.3} />
      </button>

      {isOpen ? (
        <div
          className="fixed inset-0 z-50 grid place-items-center bg-black/55 px-5 py-8"
          role="presentation"
        >
          <section
            className="relative w-full max-w-lg rounded-lg border border-[#16151a]/10 bg-white p-5 text-left shadow-[0_24px_70px_rgba(17,17,24,0.3)]"
            role="dialog"
            aria-modal="true"
            aria-labelledby="edit-recording-title"
          >
            <button
              className="absolute right-4 top-4 inline-grid size-8 place-items-center rounded-lg text-[#686a70] transition hover:bg-[#16151a]/6 hover:text-[#16151a]"
              onClick={closeModal}
              type="button"
              aria-label="Fechar edição"
              title="Fechar"
            >
              <X aria-hidden="true" size={18} />
            </button>

            <div className="grid size-10 place-items-center rounded-lg bg-[#fff2eb] text-[#d85a30]">
              <Pencil aria-hidden="true" size={19} strokeWidth={2.3} />
            </div>
            <h2 id="edit-recording-title" className="mt-4 pr-10 text-xl font-black">
              Editar gravação
            </h2>
            <p className="mt-2 text-sm leading-6 text-[#686a70]">
              As alterações também aparecerão no link público.
            </p>

            <form className="mt-5 grid gap-4" onSubmit={submitUpdate}>
              <label className="grid gap-2 text-sm font-black" htmlFor={titleId}>
                Título
                <input
                  id={titleId}
                  className="h-11 rounded-lg border border-[#16151a]/14 bg-white px-3 font-normal outline-none transition focus:border-[#d85a30] focus:ring-3 focus:ring-[#d85a30]/12"
                  maxLength={120}
                  onChange={(event) => setTitle(event.target.value)}
                  required
                  value={title}
                />
              </label>

              <label className="grid gap-2 text-sm font-black" htmlFor={descriptionId}>
                <span className="flex items-center justify-between gap-3">
                  Descrição
                  <span className="font-mono text-xs font-normal text-[#858188]">
                    {description.length}/1000
                  </span>
                </span>
                <textarea
                  id={descriptionId}
                  className="min-h-28 resize-y rounded-lg border border-[#16151a]/14 bg-white p-3 font-normal leading-6 outline-none transition focus:border-[#d85a30] focus:ring-3 focus:ring-[#d85a30]/12"
                  maxLength={1000}
                  onChange={(event) => setDescription(event.target.value)}
                  placeholder="Adicione o contexto necessário para entender a evidência."
                  value={description}
                />
              </label>

              {error ? (
                <p className="rounded-lg border border-red-500/20 bg-red-50 p-3 text-sm text-red-800">
                  {error}
                </p>
              ) : null}

              <div className="flex justify-end gap-2 pt-1">
                <button
                  className="h-10 rounded-lg border border-[#16151a]/12 px-4 text-sm font-black text-[#454249] transition hover:bg-[#16151a]/5 disabled:opacity-50"
                  disabled={isPending}
                  onClick={closeModal}
                  type="button"
                >
                  Cancel
                </button>
                <button
                  className="h-10 rounded-lg bg-[#d85a30] px-4 text-sm font-black text-white transition hover:bg-[#bd4827] disabled:cursor-wait disabled:opacity-60"
                  disabled={isPending}
                  type="submit"
                >
                  {isPending ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </form>
          </section>
        </div>
      ) : null}
    </>
  );
}
