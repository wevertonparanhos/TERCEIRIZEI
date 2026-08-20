"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

type Comment = { id: string; body: string; createdAt: string; authorName: string; authorIsClient: boolean };

export function ProcessComments({
  processId,
  comments,
  addComment,
}: {
  processId: string;
  comments: Comment[];
  addComment: (processId: string, body: string) => Promise<void>;
}) {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function action(formData: FormData) {
    const body = (formData.get("body") as string) ?? "";
    setSubmitting(true);
    setError(null);
    try {
      await addComment(processId, body);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível enviar o comentário.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div>
      <h3 className="text-sm font-semibold text-brand-navy">
        Comentários {comments.length > 0 && <span className="font-normal text-slate-400">({comments.length})</span>}
      </h3>

      {comments.length === 0 && <p className="mt-3 text-sm text-slate-400">Nenhum comentário ainda.</p>}

      {comments.length > 0 && (
        <ul className="mt-3 space-y-3">
          {comments.map((comment) => (
            <li key={comment.id} className="rounded-md bg-slate-50 p-3">
              <div className="flex items-center gap-2 text-xs text-slate-500">
                <span className="font-medium text-slate-700">{comment.authorName}</span>
                {comment.authorIsClient && (
                  <span className="rounded-full bg-blue-100 px-2 py-0.5 text-[11px] text-brand-blue">Cliente</span>
                )}
                <span>{new Date(comment.createdAt).toLocaleString("pt-BR")}</span>
              </div>
              <p className="mt-1.5 whitespace-pre-wrap text-sm text-slate-700">{comment.body}</p>
            </li>
          ))}
        </ul>
      )}

      <form action={action} className="mt-4 space-y-2 border-t border-slate-100 pt-4">
        <Textarea name="body" rows={3} placeholder="Escreva um comentário..." required />
        <Button type="submit" size="sm" disabled={submitting}>
          {submitting ? "Enviando..." : "Comentar"}
        </Button>
      </form>
      {error && <p className="mt-2 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
    </div>
  );
}
