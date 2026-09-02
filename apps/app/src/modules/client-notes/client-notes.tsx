"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

type Note = { id: string; body: string; createdAt: string; authorId: string; authorName: string; pinned: boolean };

export function ClientNotes({
  clientId,
  notes,
  currentUserId,
  canManageAll,
  addNote,
  togglePinned,
  deleteNote,
}: {
  clientId: string;
  notes: Note[];
  currentUserId: string;
  canManageAll: boolean;
  addNote: (clientId: string, body: string) => Promise<void>;
  togglePinned: (noteId: string, pinned: boolean) => Promise<void>;
  deleteNote: (noteId: string) => Promise<void>;
}) {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [confirmingDeleteId, setConfirmingDeleteId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const sorted = [...notes].sort((a, b) => {
    if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });

  async function action(formData: FormData) {
    const body = (formData.get("body") as string) ?? "";
    setSubmitting(true);
    setError(null);
    try {
      await addNote(clientId, body);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível salvar a anotação.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleTogglePinned(noteId: string, pinned: boolean) {
    setBusyId(noteId);
    try {
      await togglePinned(noteId, pinned);
      router.refresh();
    } finally {
      setBusyId(null);
    }
  }

  async function handleDelete(noteId: string) {
    setBusyId(noteId);
    try {
      await deleteNote(noteId);
      router.refresh();
    } finally {
      setBusyId(null);
      setConfirmingDeleteId(null);
    }
  }

  return (
    <div>
      <h2 className="text-base font-semibold text-ink">
        Anotações {notes.length > 0 && <span className="font-normal text-muted-soft">({notes.length})</span>}
      </h2>
      <p className="mt-0.5 text-xs text-muted-soft">Visível só para a equipe — o cliente nunca vê estas anotações.</p>

      {sorted.length === 0 && <p className="mt-3 text-sm text-muted-soft">Nenhuma anotação ainda.</p>}

      {sorted.length > 0 && (
        <ul className="mt-3 space-y-3">
          {sorted.map((note) => {
            const canDelete = canManageAll || note.authorId === currentUserId;
            const busy = busyId === note.id;
            return (
              <li key={note.id} className={`rounded-md p-3 ${note.pinned ? "bg-accent-soft" : "bg-surface-alt"}`}>
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 text-xs text-muted">
                    <span className="font-medium text-ink">{note.authorName}</span>
                    {note.pinned && <span className="text-xs font-medium text-accent">Fixada</span>}
                    <span>{new Date(note.createdAt).toLocaleString("pt-BR")}</span>
                  </div>
                  <div className="flex items-center gap-3 text-xs">
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => handleTogglePinned(note.id, !note.pinned)}
                      className="text-accent hover:underline"
                    >
                      {note.pinned ? "Desafixar" : "Fixar"}
                    </button>
                    {canDelete &&
                      (confirmingDeleteId === note.id ? (
                        <>
                          <button
                            type="button"
                            disabled={busy}
                            onClick={() => handleDelete(note.id)}
                            className="text-red-600 hover:underline"
                          >
                            Confirmar exclusão
                          </button>
                          <button type="button" onClick={() => setConfirmingDeleteId(null)} className="text-muted hover:underline">
                            Cancelar
                          </button>
                        </>
                      ) : (
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => setConfirmingDeleteId(note.id)}
                          className="text-muted hover:underline"
                        >
                          Excluir
                        </button>
                      ))}
                  </div>
                </div>
                <p className="mt-1.5 whitespace-pre-wrap text-sm text-ink">{note.body}</p>
              </li>
            );
          })}
        </ul>
      )}

      <form action={action} className="mt-4 space-y-2 border-t border-border pt-4">
        <Textarea name="body" rows={3} placeholder="Escreva uma anotação interna sobre este cliente..." required />
        <Button type="submit" size="sm" disabled={submitting}>
          {submitting ? "Salvando..." : "Adicionar anotação"}
        </Button>
      </form>
      {error && (
        <p className="mt-2 rounded-md bg-red-50 dark:bg-red-500/10 px-3 py-2 text-sm text-red-700 dark:text-red-400">{error}</p>
      )}
    </div>
  );
}
