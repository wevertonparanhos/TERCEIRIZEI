"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Pencil, X } from "lucide-react";

/** Título da tarefa com edição na hora: o lápis ao lado do nome abre o campo; Enter salva e Esc cancela. */
export function EditableTitle({
  title,
  canEdit,
  rename,
}: {
  title: string;
  canEdit: boolean;
  rename: (title: string) => Promise<{ ok: true } | { ok: false; error: string }>;
}) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(title);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  function start() {
    setValue(title);
    setError(null);
    setEditing(true);
    setTimeout(() => inputRef.current?.select(), 0);
  }

  async function save() {
    const next = value.trim();
    if (next === title) {
      setEditing(false);
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const result = await rename(next);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setEditing(false);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível alterar o nome.");
    } finally {
      setSaving(false);
    }
  }

  if (!editing) {
    return (
      <div className="group flex min-w-0 items-start gap-2">
        <h1 className="text-3xl font-bold leading-tight text-ink">{title}</h1>
        {canEdit && (
          <button
            type="button"
            onClick={start}
            title="Alterar o nome da tarefa"
            aria-label="Alterar o nome da tarefa"
            className="mt-1.5 flex h-8 w-8 flex-none items-center justify-center rounded-lg text-muted transition-colors hover:bg-surface-alt hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
          >
            <Pencil className="h-4 w-4" />
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-1.5">
      <form
        className="flex items-center gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          save();
        }}
      >
        <input
          ref={inputRef}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Escape") setEditing(false);
          }}
          disabled={saving}
          maxLength={200}
          aria-label="Nome da tarefa"
          autoFocus
          className="h-12 w-full min-w-0 rounded-xl border border-accent bg-surface px-3 text-2xl font-bold text-ink focus:outline-none focus:ring-2 focus:ring-accent/30 disabled:opacity-60"
        />
        <button
          type="submit"
          disabled={saving}
          aria-label="Salvar nome"
          title="Salvar"
          className="flex h-10 w-10 flex-none items-center justify-center rounded-lg bg-accent text-white transition-colors hover:bg-accent/90 disabled:opacity-60"
        >
          <Check className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={() => setEditing(false)}
          disabled={saving}
          aria-label="Cancelar"
          title="Cancelar"
          className="flex h-10 w-10 flex-none items-center justify-center rounded-lg border border-border-strong text-muted transition-colors hover:bg-surface-alt hover:text-ink"
        >
          <X className="h-4 w-4" />
        </button>
      </form>
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}
