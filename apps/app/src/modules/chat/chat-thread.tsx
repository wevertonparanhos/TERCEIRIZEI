"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

type Message = { id: string; body: string; createdAt: string; authorName: string; isMine: boolean };

export function ChatThread({
  messages,
  send,
}: {
  messages: Message[];
  send: (body: string) => Promise<void>;
}) {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function action(formData: FormData) {
    const body = (formData.get("body") as string) ?? "";
    setSubmitting(true);
    setError(null);
    try {
      await send(body);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível enviar a mensagem.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex-1 space-y-3 overflow-y-auto p-4">
        {messages.length === 0 && <p className="text-sm text-muted-soft">Nenhuma mensagem ainda.</p>}
        {messages.map((m) => (
          <div key={m.id} className={`flex ${m.isMine ? "justify-end" : "justify-start"}`}>
            <div
              className={`max-w-[75%] rounded-lg px-3 py-2 text-sm ${
                m.isMine ? "bg-accent text-white" : "bg-surface-alt text-ink"
              }`}
            >
              <p className="mb-0.5 text-xs font-medium opacity-70">{m.authorName}</p>
              <p className="whitespace-pre-wrap">{m.body}</p>
              <p className={`mt-1 text-right text-[11px] ${m.isMine ? "text-white/70" : "text-muted-soft"}`}>
                {new Date(m.createdAt).toLocaleString("pt-BR")}
              </p>
            </div>
          </div>
        ))}
      </div>

      <form action={action} className="flex items-end gap-2 border-t border-border p-4">
        <Textarea name="body" rows={2} placeholder="Escreva uma mensagem..." required className="flex-1" />
        <Button type="submit" disabled={submitting}>
          {submitting ? "Enviando..." : "Enviar"}
        </Button>
      </form>
      {error && (
        <p className="mx-4 mb-3 rounded-md bg-red-50 dark:bg-red-500/10 px-3 py-2 text-sm text-red-700 dark:text-red-400">{error}</p>
      )}
    </div>
  );
}
