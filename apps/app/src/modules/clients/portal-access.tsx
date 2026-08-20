"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function PortalAccess({
  clientId,
  linkedEmail,
  defaultEmail,
  invite,
}: {
  clientId: string;
  linkedEmail: string | null;
  defaultEmail: string;
  invite: (clientId: string, email: string) => Promise<{ inviteLink: string }>;
}) {
  const router = useRouter();
  const [email, setEmail] = useState(defaultEmail);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [inviteLink, setInviteLink] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  async function handleInvite() {
    setSubmitting(true);
    setError(null);
    try {
      const result = await invite(clientId, email);
      setInviteLink(result.inviteLink);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível criar o acesso.");
    } finally {
      setSubmitting(false);
    }
  }

  async function copyLink() {
    if (!inviteLink) return;
    await navigator.clipboard.writeText(inviteLink);
    setCopied(true);
  }

  if (linkedEmail) {
    return (
      <div className="rounded-lg border border-border bg-surface p-6">
        <h2 className="text-base font-semibold text-ink">Acesso ao Portal</h2>
        <p className="mt-2 text-sm text-muted">
          Este cliente já acessa o Portal com o e-mail <b>{linkedEmail}</b>.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-border bg-surface p-6">
      <h2 className="text-base font-semibold text-ink">Acesso ao Portal</h2>
      <p className="mt-1 text-sm text-muted">
        Este cliente ainda não tem acesso ao Portal. Crie o acesso e envie o link pra ele definir a própria senha.
      </p>
      <div className="mt-3 flex items-center gap-2">
        <Input value={email} onChange={(e) => setEmail(e.target.value)} className="max-w-xs" />
        <Button type="button" onClick={handleInvite} disabled={submitting}>
          {submitting ? "Criando..." : "Criar acesso"}
        </Button>
      </div>

      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}

      {inviteLink && (
        <div className="mt-4 rounded-md border border-emerald-200 dark:border-emerald-500/30 bg-emerald-50 dark:bg-emerald-500/10 p-4">
          <p className="text-sm font-medium text-emerald-800">Acesso criado! Copie o link e envie pro cliente.</p>
          <div className="mt-2 flex items-center gap-2">
            <Input value={inviteLink} readOnly className="flex-1 bg-surface font-mono text-xs" />
            <Button type="button" variant="outline" onClick={copyLink}>
              {copied ? "Copiado!" : "Copiar"}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
